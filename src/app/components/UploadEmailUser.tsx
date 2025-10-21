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
import { useTranslations } from "next-intl";

export default function UploadEmailUser({ link }: { link: string }) {
  const t = useTranslations("EmailToUserWhenUPloadingDicom");

  return (
    <Html>
      <Tailwind>
        <Body>
          <Container>
            <Preview>{t("preview")}</Preview>
            <Section className="my-[16px]">
              <Section className="text-center">
                <Button
                  className="w-[46px] cursor-pointer mb-4"
                  href="https://www.cadia.pe/"
                  target="_blank"
                >
                  <Img
                    alt="Cadia.pe"
                    className="w-full rounded-[12px] object-cover"
                    height="46"
                    src="https://www.cadia.pe/favicon.png"
                  />
                </Button>
              </Section>
              <Img
                alt="Cadia.pe"
                className="w-full rounded-[12px] object-cover"
                height="320"
                src="https://www.cadia.pe/radiologist.png"
              />
              <Section className="mt-[32px] text-center">
                <Link
                  href="https://www.cadia.pe"
                  target="_blank"
                  className="my-[16px] font-semibold text-[18px] text-rose-400 leading-[28px]"
                >
                  Cadia.pe
                </Link>
                <Heading
                  as="h1"
                  className="m-0 mt-[8px] font-semibold text-[36px] text-gray-900 leading-[36px]"
                >
                  {t("title")}
                </Heading>
                <Text className="text-[16px] text-gray-500 leading-[24px]">{t("description")}</Text>
                <Button
                  className="text-[16px] cursor-pointer text-white font-semibold mb-8 gap-4 px-8 py-4 bg-cyan-500 rounded-full"
                  href={link}
                >
                  View The Report
                </Button>
                <Text className="text-[14px] text-gray-500 leading-[24px]">
                  For more detailed information about our services, including the types of studies
                  we offer and how we can help you, please visit our website at{" "}
                  <Link
                    href="https://www.cadia.pe/"
                    target="_blank"
                    title="Cadia.pe"
                    className="text-black underline"
                  >
                    www.cadia.pe
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
