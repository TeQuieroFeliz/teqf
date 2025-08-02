import { NextResponse } from 'next/server';
import sharp from 'sharp';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(request: Request) {
  try {
    const { event, subEvents } = await request.json();

    if (!event || !subEvents) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Set default font and text color
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text(event?.title || 'Untitled', pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 10;

    for (let index = 0; index < subEvents.length; index++) {
      const subEvent = subEvents[index];

      if (currentY > doc.internal.pageSize.height - 30 && index > 0) {
        doc.addPage();
        currentY = 15;
      } else if (index > 0) {
        currentY += 8;
      }

      // Sub-event Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${index + 1}. ${subEvent.subEventName}`, 14, currentY);
      currentY += 6;

      // Metadata
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const metadata = [
        [
          `Date: ${new Date(subEvent.date).toLocaleDateString()}`,
          `City: ${subEvent.city}`,
        ],
        [`Address: ${subEvent.address}`, ''],
        [
          `Start Time: ${subEvent.startTime}`,
          `Finish Time: ${subEvent.finishTime}`,
        ],
      ];
      metadata.forEach((row) => {
        doc.text(row[0], 14, currentY);
        if (row[1]) doc.text(row[1], pageWidth / 2, currentY);
        currentY += 4;
      });

      // Add subEvent colors right after metadata, before the table
      if (subEvent.colors && subEvent.colors.length > 0) {
        currentY += 4; // Extra space before colors
        doc.setFont('helvetica', 'bold');
        doc.text('Event Colors:', 14, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        const colorSquareSize = 5;
        const startX = 20; // Indent slightly from the left
        let currentX = startX;
        const maxWidth = pageWidth - 20;
        const borderWidth = 0.3; // Border width in mm

        // First pass to calculate needed height
        let neededHeight = colorSquareSize;
        let lineWidth = 0;

        subEvent.colors.forEach((colorObj: any) => {
          const colorWidth =
            colorSquareSize + 10 + colorObj.colorCode.length * 1.5;
          if (lineWidth + colorWidth > maxWidth - startX) {
            neededHeight += colorSquareSize + 3;
            lineWidth = colorWidth;
          } else {
            lineWidth += colorWidth;
          }
        });

        // Check if we need a new page
        if (currentY + neededHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 15;
        }

        // Draw colors
        subEvent.colors.forEach((colorObj: any) => {
          const colorWidth =
            colorSquareSize + 10 + colorObj.colorCode.length * 1.5;

          if (currentX + colorWidth > maxWidth) {
            currentX = startX;
            currentY += colorSquareSize + 3;
          }

          // Draw color square with border
          doc.setDrawColor(0, 0, 0); // Black border
          doc.setLineWidth(borderWidth);

          // First draw the filled rectangle
          doc.setFillColor(colorObj.colorCode);
          doc.rect(currentX, currentY, colorSquareSize, colorSquareSize, 'F');

          // Then draw the border rectangle
          doc.rect(currentX, currentY, colorSquareSize, colorSquareSize, 'S');

          // Draw color code text
          doc.setTextColor(0, 0, 0);
          doc.text(
            colorObj.colorCode,
            currentX + colorSquareSize + 2,
            currentY + colorSquareSize / 2 + 1
          );

          currentX += colorWidth;
        });

        currentY += colorSquareSize + 6; // Space after colors
      }

      currentY += 3; // Space before table

      // Image fetching and table generation remains the same...
      const images: ({ data: string; format: string } | null)[] =
        await Promise.all(
          (subEvent.items || []).map(async (item: any) => {
            if (!item.image) return null;

            try {
              const response = await fetch(item.image);
              if (!response.ok) return null;

              const contentType = response.headers
                .get('content-type')
                ?.toLowerCase();
              const buffer = await response.arrayBuffer();

              let finalImageBuffer: Buffer;
              let finalImageFormat: 'PNG' | 'JPEG' | 'WEBP';

              if (contentType === 'image/svg+xml') {
                finalImageBuffer = await sharp(Buffer.from(buffer))
                  .png()
                  .toBuffer();
                finalImageFormat = 'PNG';
              } else if (
                ['image/jpeg', 'image/png', 'image/webp'].includes(
                  contentType || ''
                )
              ) {
                finalImageBuffer = Buffer.from(buffer);
                finalImageFormat = contentType!.split('/')[1].toUpperCase() as
                  | 'PNG'
                  | 'JPEG'
                  | 'WEBP';
              } else {
                console.warn(`Unsupported image type: ${contentType}`);
                return null;
              }

              const base64 = `data:image/${finalImageFormat.toLowerCase()};base64,${finalImageBuffer.toString('base64')}`;

              return { data: base64, format: finalImageFormat };
            } catch (error) {
              console.error('Failed to fetch or process image:', error);
              return null;
            }
          })
        );

      const itemRows = (subEvent.items || []).map((item: any, i: number) => {
        const colorsDisplay = (item.colors || [])
          .map((color: any) => `${color.name} (${color.quantity})`)
          .join('\n');

        return [
          i + 1,
          '', // Image placeholder
          item.name,
          item.categoryName,
          item.quantity,
          item.size || '',
          colorsDisplay,
          item.type || '',
          item.description || '',
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [
          [
            '#',
            'Image',
            'Item Name',
            'Category',
            'Quantity',
            'Size',
            'Color + Quantity',
            'Type',
            'Description',
          ],
        ],
        body: itemRows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          textColor: 33,
          cellPadding: 2,
          lineColor: 200,
          lineWidth: 0.1,
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9,
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 22, halign: 'center' }, // Image
          2: { cellWidth: 30 }, // Item Name
          3: { cellWidth: 20 }, // Category
          4: { cellWidth: 15, halign: 'center' }, // Quantity
          5: { cellWidth: 15 }, // Size
          6: { cellWidth: 25 }, // Color + Qty
          7: { cellWidth: 15 }, // Type
          8: { cellWidth: 32 }, // Description
        },
        didParseCell: function (data: any) {
          const imageColumnIndex = 1;
          const imageRowHeight = 22;

          if (
            data.column.index === imageColumnIndex &&
            data.row.section === 'body' &&
            data.row.index < images.length &&
            images[data.row.index]
          ) {
            data.row.height = imageRowHeight;
          }
        },
        didDrawCell: function (data: any) {
          const imageColumnIndex = 1;

          if (
            data.column.index === imageColumnIndex &&
            data.row.section === 'body' &&
            data.row.index < images.length &&
            images[data.row.index]
          ) {
            const imgObject = images[data.row.index];
            if (!imgObject) return;

            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;
            const imgSize = 16;

            const imgX = data.cell.x + (cellWidth - imgSize) / 2;
            const imgY = data.cell.y + (cellHeight - imgSize) / 2;

            try {
              doc.addImage(
                imgObject.data,
                imgObject.format,
                imgX,
                imgY,
                imgSize,
                imgSize
              );
            } catch (error) {
              console.warn('Failed to add image to PDF:', error);
            }
          }
        },
        didDrawPage: function (data: any) {
          currentY = data?.cursor?.y + 8;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${(doc as any).internal.getNumberOfPages()}`,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
          );
        },
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.height - 10
    );

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${
          event.title || 'event'
        }.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
