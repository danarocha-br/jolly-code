import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import { Logo } from "@/components/ui/logo";

interface UsageLimitWarningEmailProps {
  usagePercent?: number;
  userName?: string;
}

export default function UsageLimitWarningEmail({
  usagePercent,
  userName,
}: UsageLimitWarningEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Just a heads-up — you're at {usagePercent?.toString() || "90"}% capacity
      </Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <div className="flex justify-center">
              <Logo variant="short" className="mx-auto scale-75 -mb-5" />
            </div>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              You’re nearing your storage limit on Jolly Code
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hey {userName || "there"}!
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              You've used <strong>{usagePercent ?? 90}%</strong> of your current
              plan's storage. To avoid hitting your limit and ensure
              uninterrupted access to your snippets and animations, you may want
              to:
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              • Upgrade your plan for more space<br />
              • Or remove old items to free up room
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              Take action now to keep things running smoothly.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Link
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={
                  `${process.env.NEXT_PUBLIC_APP_URL}` ||
                  "https://jollycode.dev/"
                }
              >
                Manage Subscription
              </Link>
            </Section>

						<Text className="text-black text-[14px] leading-[24px]">Happy coding,</Text>
						<Text className="text-black text-[14px] leading-[24px]">
							The Jolly Code Team
						</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
