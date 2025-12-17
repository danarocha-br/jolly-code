'use server'

import * as Sentry from '@sentry/nextjs'
import React from 'react'

import { requireAuth } from '@/actions/utils/auth'
import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { createServiceRoleClient } from '@/utils/supabase/admin'
import { deleteStripeCustomer } from '@/lib/services/stripe'
import { sendEmail } from '@/lib/email/send-email'
import AccountDeletedEmail from '@emails/account-deleted-email'
import { getUsageLimitsCacheProvider } from '@/lib/services/usage-limits-cache'
import { captureServerEvent } from '@/lib/services/tracking/server'
import { ACCOUNT_EVENTS } from '@/lib/services/tracking/events'

/**
 * Server Action: Delete user account
 * 
 * This action:
 * 1. Authenticates the user
 * 2. Sends confirmation email (before deletion so we have the email)
 * 3. Deletes Stripe customer (automatically cancels subscriptions)
 * 4. Deletes waitlist entries (manual cleanup)
 * 5. Deletes user from auth.users (cascades to all related data via foreign keys)
 * 6. Clears usage cache
 * 7. Logs deletion for audit purposes
 * 
 * @returns ActionResult with success status or error message
 */
export async function deleteAccount(): Promise<ActionResult<{ success: true }>> {
  let user: { id: string; email?: string } | null = null;
  try {
    // Authenticate user
    const authResult = await requireAuth();
    user = authResult.user;
    const { supabase } = authResult;

    // Validate user ID
    if (!user?.id || typeof user.id !== 'string') {
      console.error('[deleteAccount] Invalid user ID:', user?.id)
      return error('Invalid user account. Please try signing out and signing back in.')
    }

    if (!user.email) {
      return error('User email is required for account deletion')
    }

    // Get user profile to retrieve Stripe customer ID and username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, username, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[deleteAccount] Failed to load profile:', profileError)
      Sentry.captureException(profileError, {
        tags: { operation: 'delete_account_load_profile' },
        extra: { userId: user.id, errorCode: profileError.code, errorMessage: profileError.message },
      })
      
      // If profile doesn't exist, we can still proceed with deletion
      // The user might have been partially deleted or profile creation failed
      if (profileError.code === 'PGRST116') {
        console.warn('[deleteAccount] Profile not found, proceeding with deletion anyway')
        // Continue with minimal data
      } else {
        return error('Failed to load user profile. Please try again later.')
      }
    }

    // Use profile data if available, otherwise use minimal data from user object
    const profileData = profile || null

    const userEmail = profileData?.email || user.email
    const userName = profileData?.username || undefined
    const stripeCustomerId = profileData?.stripe_customer_id || null

    // Validate email before sending
    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      console.warn('[deleteAccount] Invalid or missing email address, skipping email notification:', {
        userId: user.id,
        profileEmail: profileData?.email,
        userEmail: user.email,
      })
      // Continue with deletion even if email is invalid
    } else {
      // Send confirmation email BEFORE deletion (so we have the email address)
      try {
        await sendEmail({
          to: userEmail,
          subject: 'Your Jolly Code account has been deleted',
          react: React.createElement(AccountDeletedEmail, { name: userName }),
          idempotencyKey: `account-deleted-${user.id}-${Date.now()}`,
        })
        console.log(`[deleteAccount] Sent deletion confirmation email to ${userEmail}`)
      } catch (emailError) {
        // Log email error but don't fail deletion (non-critical)
        console.error('[deleteAccount] Failed to send confirmation email:', emailError)
        Sentry.captureException(emailError, {
          level: 'warning',
          tags: { operation: 'delete_account_send_email' },
          extra: { userId: user.id, email: userEmail },
        })
      }
    }

    // Delete Stripe customer (automatically cancels all subscriptions)
    if (stripeCustomerId && typeof stripeCustomerId === 'string' && stripeCustomerId.trim() !== '') {
      try {
        await deleteStripeCustomer(stripeCustomerId)
        console.log(`[deleteAccount] Deleted Stripe customer ${stripeCustomerId} for user ${user.id}`)
      } catch (stripeError) {
        // Log Stripe error but continue with database deletion
        // User can contact support if there are billing issues
        console.error('[deleteAccount] Failed to delete Stripe customer:', stripeError)
        Sentry.captureException(stripeError, {
          level: 'error',
          tags: { operation: 'delete_account_stripe' },
          extra: {
            userId: user.id,
            stripeCustomerId,
          },
        })
        // Continue with deletion - don't fail the entire operation
      }
    } else if (stripeCustomerId) {
      console.warn('[deleteAccount] Invalid Stripe customer ID format, skipping deletion:', {
        userId: user.id,
        stripeCustomerId,
      })
    }

    // Use service role client for admin operations
    const adminSupabase = createServiceRoleClient()

    // Manually delete waitlist entries (user_id is nullable, may not cascade)
    try {
      const { error: waitlistError } = await adminSupabase
        .from('waitlist')
        .delete()
        .eq('user_id', user.id)

      if (waitlistError) {
        console.warn('[deleteAccount] Failed to delete waitlist entries:', waitlistError)
        // Non-critical, continue with deletion
      }
    } catch (waitlistError) {
      console.warn('[deleteAccount] Error deleting waitlist entries:', waitlistError)
      // Non-critical, continue with deletion
    }

    // Manually delete stripe_webhook_audit entries (user_id is nullable, uses ON DELETE SET NULL)
    // We delete these for GDPR compliance and complete account cleanup
    try {
      const { error: auditError } = await adminSupabase
        .from('stripe_webhook_audit')
        .delete()
        .eq('user_id', user.id)

      if (auditError) {
        console.warn('[deleteAccount] Failed to delete webhook audit entries:', auditError)
        // Non-critical, continue with deletion
      }
    } catch (auditError) {
      console.warn('[deleteAccount] Error deleting webhook audit entries:', auditError)
      // Non-critical, continue with deletion
    }

    // Clear usage cache before deletion
    try {
      getUsageLimitsCacheProvider().delete(user.id)
    } catch (cacheError) {
      console.warn('[deleteAccount] Failed to clear usage cache:', cacheError)
      // Non-critical, continue with deletion
    }

    // Sign out all user sessions before deletion
    // This helps avoid "Database error" issues that can occur if there are active sessions
    try {
      const { error: signOutError } = await adminSupabase.auth.admin.signOut(user.id, 'global')
      if (signOutError) {
        console.warn('[deleteAccount] Failed to sign out user sessions:', signOutError)
        // Non-critical, continue with deletion
      } else {
        console.log('[deleteAccount] Signed out all user sessions')
      }
    } catch (signOutErr) {
      console.warn('[deleteAccount] Error signing out user sessions:', signOutErr)
      // Non-critical, continue with deletion
    }

    // Delete user from auth.users
    // This triggers CASCADE deletion of:
    // - profiles (which cascades to snippets, collections, animations, links, usage_limits, share_view_events)
    // - All related data via foreign key constraints
    const { data: deleteData, error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('[deleteAccount] Failed to delete user:', deleteError)
      console.error('[deleteAccount] Error details:', {
        message: deleteError.message,
        code: deleteError.code || deleteError.status,
        status: deleteError.status,
        userId: user.id,
        name: deleteError.name,
      })
      
      // Log the full error object for debugging
      console.error('[deleteAccount] Full error object:', JSON.stringify(deleteError, null, 2))
      
      Sentry.captureException(deleteError, {
        level: 'error',
        tags: { operation: 'delete_account_auth' },
        extra: { 
          userId: user.id,
          errorCode: deleteError.code || deleteError.status,
          errorStatus: deleteError.status,
          errorMessage: deleteError.message,
          errorName: deleteError.name,
        },
      })
      
      // Provide a more helpful error message based on error type
      let errorMessage = 'Failed to delete account. Please contact support if this issue persists.'
      
      if (deleteError.message?.includes('Database error')) {
        errorMessage = 'Failed to delete account due to a database constraint. This may be due to active sessions or other dependencies. Please try signing out and signing back in, then try again. If the issue persists, please contact support.'
      } else if (deleteError.code === 'user_not_found') {
        // User already deleted - this is actually a success case
        console.log('[deleteAccount] User already deleted, treating as success')
        return success({ success: true })
      } else if (deleteError.message) {
        errorMessage = `Failed to delete account: ${deleteError.message}`
      }
      
      // Track account deletion failed (non-blocking)
      void captureServerEvent(ACCOUNT_EVENTS.DELETE_ACCOUNT_FAILED, {
        userId: user.id,
        properties: {
          error_code: deleteError.code || deleteError.status,
          error_message: deleteError.message,
        },
      })
      
      return error(errorMessage)
    }
    
    // Verify deletion was successful
    // Note: deleteUser may return null user object even on success (user is deleted)
    // So we check for the absence of an error rather than the presence of user data
    if (deleteData?.user) {
      console.log('[deleteAccount] User deletion confirmed:', deleteData.user.id)
    } else {
      // No user data returned is expected - user has been deleted
      console.log('[deleteAccount] User deletion successful (user object removed)')
    }

    // Log successful deletion for audit
    console.log(`[deleteAccount] Successfully deleted account for user ${user.id}`)
    Sentry.captureMessage('User account deleted', {
      level: 'info',
      tags: { operation: 'delete_account_success' },
      extra: {
        userId: user.id,
        email: userEmail,
        hadStripeCustomer: !!stripeCustomerId,
      },
    })

    // Track account deletion completed (non-blocking - user is already deleted)
    void captureServerEvent(ACCOUNT_EVENTS.DELETE_ACCOUNT_COMPLETED, {
      userId: user.id,
      properties: {
        had_stripe_customer: !!stripeCustomerId,
      },
    })

    return success({ success: true })
  } catch (err) {
    console.error('[deleteAccount] Unexpected error:', err)

    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'

    Sentry.captureException(err, {
      tags: { operation: 'delete_account' },
    })

    // Track account deletion failed (non-blocking)
    // Note: user may not be defined in catch block if error occurred before requireAuth
    const userId = user?.id;
    if (userId) {
      void captureServerEvent(ACCOUNT_EVENTS.DELETE_ACCOUNT_FAILED, {
        userId,
        properties: {
          error_message: errorMessage,
        },
      });
    }

    if (err instanceof Error && errorMessage.includes('authenticated')) {
      return error('User must be authenticated')
    }

    return error('Failed to delete account. Please try again later or contact support.')
  }
}

