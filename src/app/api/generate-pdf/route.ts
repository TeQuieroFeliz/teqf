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

      if (currentY > doc.internal.pageSize.height - 40 && index > 0) {
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
        currentY += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('Event Colors:', 14, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        const colorSquareSize = 5;
        const startX = 20;
        let currentX = startX;
        const maxWidth = pageWidth - 20;
        const borderWidth = 0.3;

        let neededHeight = colorSquareSize;
        let lineWidth = 0;

        subEvent.colors.forEach((colorObj: any) => {
          const colorWidth =
            colorSquareSize +
            10 +
            (colorObj.colorCode || colorObj.code || '').length * 1.5;
          if (lineWidth + colorWidth > maxWidth - startX) {
            neededHeight += colorSquareSize + 3;
            lineWidth = colorWidth;
          } else {
            lineWidth += colorWidth;
          }
        });

        if (currentY + neededHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 15;
        }

        subEvent.colors.forEach((colorObj: any) => {
          const colorCode = colorObj.colorCode || colorObj.code;
          const colorWidth = colorSquareSize + 10 + colorCode.length * 1.5;

          if (currentX + colorWidth > maxWidth) {
            currentX = startX;
            currentY += colorSquareSize + 3;
          }

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(borderWidth);
          doc.setFillColor(colorCode);
          doc.rect(currentX, currentY, colorSquareSize, colorSquareSize, 'F');
          doc.rect(currentX, currentY, colorSquareSize, colorSquareSize, 'S');
          doc.setTextColor(0, 0, 0);
          doc.text(
            colorCode,
            currentX + colorSquareSize + 2,
            currentY + colorSquareSize / 2 + 1
          );
          currentX += colorWidth;
        });

        currentY += colorSquareSize + 6;
      }

      currentY += 3;

      const images: ({ data: string; format: string } | null)[] =
        await Promise.all(
          (subEvent.items || []).map(async (item: any) => {
            let imageUrl: string | null = null;
            if (Array.isArray(item.images) && item.images.length > 0) {
              imageUrl = item.images[0];
            } else if (typeof item.image === 'string') {
              imageUrl = item.image;
            }
            if (!imageUrl) return null;

            try {
              const response = await fetch(imageUrl);
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

      let subEventTotal = 0;

      const itemRows = (subEvent.items || []).map((item: any) => {
        let itemTotalQuantity = 0;
        if (Array.isArray(item.colors) && item.colors.length > 0) {
          itemTotalQuantity = item.colors.reduce((sum: number, color: any) => {
            const colorQty = parseInt(color.quantity, 10);
            return sum + (isNaN(colorQty) ? 0 : colorQty);
          }, 0);
        } else {
          const itemQty = parseInt(item.quantity, 10);
          itemTotalQuantity = isNaN(itemQty) ? 0 : itemQty;
        }

        const price = parseFloat(item.estPrice);
        if (!isNaN(price) && itemTotalQuantity > 0) {
          subEventTotal += price * itemTotalQuantity;
        }

        let desc = item.name || '';
        if (item.colors && item.colors.length > 0) {
          const colorsStr = item.colors
            .map((color: any) => `${color.quantity} in ${color.name}`)
            .join(', ');
          desc += ` (${colorsStr})`;
        }
        if (item.description) {
          desc += ` - ${item.description}`;
        }

        const formattedPrice = item.estPrice
          ? `$${parseFloat(item.estPrice).toFixed(2)}`
          : 'N/A';

        return [itemTotalQuantity, '', desc, formattedPrice];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Quantity', 'Image', 'Description', 'Est. Price USD']],
        body: itemRows,
        foot: [
          [
            {
              content: 'Total Estimated Price:',
              colSpan: 3,
              styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 },
            },
            {
              content: `$${subEventTotal.toFixed(2)}`,
              styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 },
            },
          ],
        ],
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
        },
        footStyles: {
          fillColor: [230, 230, 230],
          textColor: 33,
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 100 },
          3: { cellWidth: 30, halign: 'center' },
        },
        didParseCell: function (data: any) {
          const imageRowHeight = 22;
          if (
            data.column.index === 1 &&
            data.row.section === 'body' &&
            images[data.row.index]
          ) {
            data.row.height = imageRowHeight;
          }
        },
        didDrawCell: function (data: any) {
          if (
            data.column.index === 1 &&
            data.row.section === 'body' &&
            images[data.row.index]
          ) {
            const imgObject = images[data.row.index];
            if (!imgObject) return;
            const imgSize = 16;
            const imgX = data.cell.x + (data.cell.width - imgSize) / 2;
            const imgY = data.cell.y + (data.cell.height - imgSize) / 2;
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
        didDrawPage: function () {
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

    // Final Footer
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
        'Content-Disposition': `attachment; filename="${event.title || 'event'}.pdf"`,
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
