import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { PartialDicomWithTemplate } from "@/types/dicomType";
import {
  Document,
  Page,
  Text,
  View,
  Image as ImagePdf,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "/fonts/roboto-latin-400-normal.ttf",
      fontWeight: 400,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 60,
    paddingBottom: 120,
  },
  htmlContent: {
    fontFamily: "Roboto",
  },
  section: {
    flexGrow: 1,
    position: "relative",
  },
  text: {
    fontSize: 11,
    minHeight: 17,
    fontFamily: "Roboto",
    lineHeight: 1.6,
  },
  textSmall: {
    fontSize: 11,
    color: "#99a1af",
    width: "65pt",
  },
  textPatient: {
    fontSize: 11,
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "auto",
    padding: 60,
  },
  table: {
    fontSize: 11,
    display: "flex",
    flexDirection: "column",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    flexGrow: 0,
    flexShrink: 0,
    lineHeight: 1,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
  },
});

export default function ContentPDFDocument({
  dicom,
}: {
  dicom: PartialDicomWithTemplate;
}) {
  const getLines = (report: string) => (report ? report.split("\n") : []);

  if (!dicom.report) return null;

  return (
    <Document
      style={{
        width: "595pt",
        height: "842pt",
      }}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <ImagePdf
            fixed
            style={{ marginBottom: 24 }}
            src={dicom.template?.header_image_url}
          />
          <View style={{ marginBottom: 24, display: "flex" }}>
            <View style={styles.table}>
              <View style={[styles.row]}>
                <Text style={[styles.cell, { width: 300 }]}>
                  <Text style={styles.textSmall}>Paciente: </Text>
                  {dicom?.patient_name}
                </Text>
                <Text style={[styles.cell]}>
                  <Text style={[styles.textSmall]}>Edad: </Text>
                  {dicom?.patient_age
                    ? `${extractAgeWidthUnit(dicom?.patient_age).value} ${extractAgeWidthUnit(dicom?.patient_age).unit}`
                    : null}
                </Text>
              </View>
              <View style={[styles.row]}>
                <Text style={[styles.cell, { width: 300 }]}>
                  <Text style={styles.textSmall}>Fecha: </Text>{" "}
                  {dicom?.study_date
                    ? formatDateYYYYMMDD(dicom?.study_date)
                    : null}
                </Text>
                <Text style={[styles.cell]}>
                  <Text style={styles.textSmall}>ID: </Text>
                  {dicom?.patient_id}
                </Text>
              </View>
              <View style={[styles.row]}>
                <Text style={[styles.cell]}>
                  <Text style={styles.textSmall}>Descripción: </Text>
                  {dicom?.study_description}
                </Text>
                <Text style={[styles.cell]}></Text>
              </View>
            </View>
          </View>
          {getLines(dicom.report).map((line, index) => {
            return (
              <Text key={index} style={styles.text}>
                {line ?? ""}
              </Text>
            );
          })}
          <View
            style={{
              display: "flex",
              width: "100%",
              flexDirection: "row",
              justifyContent: "flex-end",
            }}
          >
            <ImagePdf
              style={{ width: 75, height: "auto" }}
              src={dicom.template?.sign_image_url}
            />
          </View>
        </View>
        <View style={styles.footer} fixed>
          <ImagePdf src={dicom.template?.footer_image_url} />
        </View>
      </Page>
    </Document>
  );
}
