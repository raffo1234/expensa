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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="M12.554 16.506a.75.75 0 0 1-1.107 0l-4-4.375a.75.75 0 0 1 1.107-1.012l2.696 2.95V3a.75.75 0 0 1 1.5 0v11.068l2.697-2.95a.75.75 0 1 1 1.107 1.013z"
        />
        <path
          fill="currentColor"
          d="M3.75 15a.75.75 0 0 0-1.5 0v.055c0 1.367 0 2.47.117 3.337c.12.9.38 1.658.981 2.26c.602.602 1.36.86 2.26.982c.867.116 1.97.116 3.337.116h6.11c1.367 0 2.47 0 3.337-.116c.9-.122 1.658-.38 2.26-.982s.86-1.36.982-2.26c.116-.867.116-1.97.116-3.337V15a.75.75 0 0 0-1.5 0c0 1.435-.002 2.436-.103 3.192c-.099.734-.28 1.122-.556 1.399c-.277.277-.665.457-1.4.556c-.755.101-1.756.103-3.191.103H9c-1.435 0-2.437-.002-3.192-.103c-.734-.099-1.122-.28-1.399-.556c-.277-.277-.457-.665-.556-1.4c-.101-.755-.103-1.756-.103-3.191"
        />
      </svg>
      <span>DOC</span>
    </button>
  );
};

export default DOCXPreview;
