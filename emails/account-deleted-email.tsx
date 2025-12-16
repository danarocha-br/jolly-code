import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import { Logo } from "@/components/ui/logo";

interface AccountDeletedEmailProps {
  name?: string;
}

export default function AccountDeletedEmail({ name }: AccountDeletedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Jolly Code account has been deleted</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <div className="flex justify-center">
              <Logo variant="short" className="mx-auto scale-75 -mb-5" />
            </div>
            <Heading className="text-black text-xl font-normal text-center p-0 my-[30px] mx-0">
              Your account has been deleted
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hey {name || "there"},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              This email confirms that your Jolly Code account and all associated data have been permanently deleted from our systems.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <strong>What was deleted:</strong>
            </Text>
            <Text className="text-black text-[14px] leading-[24px] ml-4">
              • Your profile and account information<br />
              • All your code snippets and animations<br />
              • All your collections and folders<br />
              • All shared links and associated data<br />
              • Your subscription information (if applicable)
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              If you had an active subscription, it has been canceled and no further charges will be made.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              If you didn't request this deletion or have any questions, please contact us immediately at{" "}
              <a href="mailto:support@jollycode.dev" className="text-blue-600 underline">
                support@jollycode.dev
              </a>
              .
            </Text>
            <Text className="text-black text-[14px] leading-[24px] mt-6">
              We're sorry to see you go. If you change your mind, you can always create a new account in the future.
            </Text>
            <Text className="text-black text-[14px] leading-[24px] mt-6">
              Best regards,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              The Jolly Code Team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

