"use client";

import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import {
  Document,
  Footer,
  Header,
  ImageRun,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { DicomType } from "@/types/dicomType";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";

export default async function createDocxDocument(
  dicom: DicomType
): Promise<Document> {
  const headerImageUrl = dicom.template?.header_image_url ?? "";
  const footerImageUrl = dicom.template?.footer_image_url ?? "";
  const signImageUrl = dicom.template?.sign_image_url ?? "";

  const patientInformation = new Table({
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    columnWidths: [6307, 2703],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 6307,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                text: `Paciente: ${dicom.patient_name ?? ""}`,
                spacing: { line: 320 },
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 2703,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                text: `Edad: ${extractAgeWidthUnit(dicom.patient_age).value}${" "}${extractAgeWidthUnit(dicom.patient_age).unit}`,
                spacing: { line: 320 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 6307,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                text: `Fecha: ${formatDateYYYYMMDD(dicom.study_date) ?? ""}`,
                spacing: { line: 320 },
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 2703,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                text: `ID: ${dicom.patient_id ?? ""}`,
                spacing: { line: 320 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 6307,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                text: `Descripción: ${dicom.study_description ?? ""}`,
                spacing: { line: 320 },
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 2703,
              type: WidthType.DXA,
            },
            children: [],
          }),
        ],
      }),
    ],
  });

  const lines = dicom.report?.split("\n") || [];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Roboto",
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        ...(dicom.template?.header_image_url
          ? {
              headers: {
                default: new Header({
                  children: [
                    new Paragraph({
                      spacing: { line: 320 },
                      children: [
                        new ImageRun({
                          data: await fetchImageBuffer(headerImageUrl),
                          transformation: {
                            width: 600,
                            height: 120,
                          },
                          type: "png",
                        }),
                      ],
                    }),
                    new Paragraph({}),
                  ],
                }),
              },
            }
          : {}),
        ...(dicom.template?.footer_image_url
          ? {
              footers: {
                default: new Footer({
                  children: [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: await fetchImageBuffer(footerImageUrl),
                          transformation: {
                            width: 600,
                            height: 120,
                          },
                          type: "png",
                        }),
                      ],
                    }),
                  ],
                }),
              },
            }
          : {}),
        children: [
          new Paragraph(""),
          new Paragraph(""),
          patientInformation,
          new Paragraph(""),
          new Paragraph(""),
          ...lines.map(
            (line) =>
              new Paragraph({
                text: line,
                spacing: { line: 320 },
              })
          ),
          new Paragraph(""),
          new Paragraph({
            alignment: "right",
            ...(dicom.template?.sign_image_url
              ? {
                  children: [
                    new ImageRun({
                      data: await fetchImageBuffer(signImageUrl),
                      transformation: {
                        width: 75,
                        height: 76,
                      },
                      type: "png",
                    }),
                  ],
                }
              : ""),
          }),
        ],
      },
    ],
  });
  return doc;
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  try {
    if (!imageUrl) return Buffer.alloc(0);
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    return Buffer.alloc(0);
  }
}
