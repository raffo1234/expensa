import {
  Tailwind,
  Section,
  Img,
  Text,
  Html,
  Heading,
  Button,
  Body,
  Link,
  Container,
  Preview,
} from "@react-email/components";

export default function ShareLinkEmail({ link }: { link: string }) {
  return (
    <Html>
      <Tailwind>
        <Body>
          <Container>
            <Preview>Instant access to your Cadia study report - download or view online.</Preview>
            <Section className="my-[16px]">
              <Section className="text-center">
                <Button
                  className="w-[46px] cursor-pointer mb-4"
                  href="https://www.cadia.cc/"
                  target="_blank"
                >
                  <Img
                    alt="Cadia"
                    className="w-full rounded-[12px] object-cover"
                    height="46"
                    src="https://www.cadia.cc/favicon.png"
                  />
                </Button>
              </Section>
              <Img
                alt="Cadia"
                className="w-full rounded-[12px] object-cover"
                height="320"
                src="https://www.cadia.cc/radiologist.png"
              />
              <Section className="mt-[32px] text-center">
                <Link
                  href="https://www.cadia.cc"
                  target="_blank"
                  className="my-[16px] font-semibold text-[18px] text-rose-400 leading-[28px]"
                >
                  Cadia
                </Link>
                <Heading
                  as="h1"
                  className="m-0 mt-[8px] font-semibold text-[36px] text-gray-900 leading-[36px]"
                >
                  Your Report is Ready
                </Heading>
                <Text className="text-[16px] text-gray-500 leading-[24px]">
                  We are pleased to inform you that your report is now ready and instantly
                  accessible.
                </Text>
                <Button
                  className="text-[16px] cursor-pointer text-white font-semibold mb-8 gap-4 px-8 py-4 bg-cyan-500 rounded-full"
                  href={link}
                >
                  View Your Report
                </Button>
                <Text className="text-[14px] text-gray-500 leading-[24px]">
                  For more detailed information about our services, including the types of studies
                  we offer and how we can help you, please visit our website at{" "}
                  <Link
                    href="https://www.cadia.cc/"
                    target="_blank"
                    className="text-black underline"
                  >
                    www.cadia.cc
                  </Link>
                  .
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
