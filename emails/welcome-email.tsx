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

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanks for subscribing to Jolly Code 🎉</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
						<div className="flex justify-center">
							<Logo variant="short" className="mx-auto scale-75 -mb-5" />
						</div>
            <Heading className="text-black text-xl font-normal text-center p-0 my-[30px] mx-0">
              Welcome to <strong>Jolly Code</strong> — Your subscription is
              active!
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hey {name || "there"}!
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              We’re thrilled to have you with us! Your subscription is now
              active, and you're all set to create stunning code snippets and
              animations with ease. <br /><br />Head over to your dashboard to start
              building, sharing, and saving your best work yet. <br />
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Link
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={
                  process.env.NEXT_PUBLIC_APP_URL || "https://jollycode.dev"
                }
              >
                Go to Dashboard
              </Link>
            </Section>
            {/* <Text className="text-black/50 text-[14px] leading-[24px]">
						Need help or have questions? Just reply to this email — we’re always happy to help.
            </Text> */}

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
