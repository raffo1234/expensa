"use client";

import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import React from "react";
import {
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { DicomType } from "@/types/dicomType";
import { Icon } from "@iconify/react/dist/iconify.js";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";

const DOCXPreview = ({ dicom }: { dicom: DicomType }) => {
  const lines = dicom.report?.split("\n") || [];
  const generateDocx = async () => {
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
                  text: `Modalidad: ${dicom.modality ?? ""}`,
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

    try {
      const responseHeader = await fetch(headerImageUrl);
      const arrayBufferHeader = await responseHeader.arrayBuffer();
      const bufferHeader = Buffer.from(arrayBufferHeader);

      const responseFooter = await fetch(footerImageUrl);
      const arrayBufferFooter = await responseFooter.arrayBuffer();
      const bufferFooter = Buffer.from(arrayBufferFooter);

      const responseSign = await fetch(signImageUrl);
      const arrayBufferSign = await responseSign.arrayBuffer();
      const bufferSign = Buffer.from(arrayBufferSign);

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
                              data: bufferHeader,
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
                              data: bufferFooter,
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
                          data: bufferSign,
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

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = Date.now();
      link.href = url;
      link.download = `${dicom.patient_name}_${dicom.user_id}_${now}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error fetching or creating document:", error);
    }
  };

  return (
    <button
      onClick={generateDocx}
      title="DOCX Preview"
      className="py-2 text-xs px-6 flex gap-2 items-center font-semibold  bg-blue-400 text-white rounded-full cursor-pointer"
    >
      <Icon icon="solar:download-minimalistic-bold" fontSize={24}></Icon>
      <span>DOC</span>
    </button>
  );
};

export default DOCXPreview;
