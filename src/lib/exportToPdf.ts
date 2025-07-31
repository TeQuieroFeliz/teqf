'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const handleExportPDF = async ({ event, subEvents }: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15; // Start Y even smaller

  // Set default font and text color for the document
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18); // Smaller title font size
  doc.setTextColor(20, 20, 20);
  doc.text(event.title, pageWidth / 2, currentY, { align: 'center' });

  currentY += 10; // Smaller space after title

  for (let index = 0; index < subEvents.length; index++) {
    const subEvent = subEvents[index];

    // Add a new page if content exceeds the current page height, with a smaller buffer
    // This check is crucial for multi-page documents
    if (currentY > doc.internal.pageSize.height - 30 && index > 0) {
      // Smaller buffer (30mm)
      doc.addPage();
      currentY = 15; // Reset Y for the new page
    } else if (index > 0) {
      // Add a small separation between sub-events on the same page
      currentY += 8; // Small gap between sub-events
    }

    // Sub-event Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12); // Smaller sub-event heading
    doc.setTextColor(40, 40, 40);
    doc.text(`${index + 1}. ${subEvent.subEventName}`, 14, currentY);
    currentY += 6; // Smaller space after sub-event header

    // Metadata
    doc.setFontSize(9); // Smaller font for metadata
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
      currentY += 4; // Smaller line spacing for metadata
    });

    currentY += 3; // Smaller space before table

    // Preload images to Base64
    const images: (string | null)[] = await Promise.all(
      (subEvent.items || []).map((item: any) => toBase64(item.image))
    );

    // Table body
    const itemRows = (subEvent.items || []).map((item: any, i: number) => {
      // Format colors for display, each on a new line
      const colorsDisplay = (item.colors || [])
        .map((color: any) => `${color.name} (${color.quantity})`)
        .join('\n'); // Use '\n' for new line in PDF table cell

      return [
        i + 1,
        item.name,
        item.categoryName,
        item.quantity,
        item.size || '',
        colorsDisplay,
        item.type || '',
        item.description || '',
        '', // Image placeholder
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          '#',
          'Item Name',
          'Category',
          'Quantity',
          'Size',
          'Color + Quantity',
          'Type',
          'Description',
          // 'Image',
        ],
      ],
      body: itemRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8, // Smaller table content font size
        textColor: 33,
        cellPadding: 2, // Smaller cell padding
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
        fontSize: 9, // Smaller header font size
        cellPadding: 2, // Smaller header cell padding
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      columnStyles: {
        // Adjusted column widths for smaller overall table
        0: { cellWidth: 8, halign: 'center' }, // #
        1: { cellWidth: 25 }, // Item Name
        2: { cellWidth: 20 }, // Category
        3: { cellWidth: 18, halign: 'center' }, // Quantity
        4: { cellWidth: 20 }, // Size
        5: { cellWidth: 25 }, // Color + Quantity
        6: { cellWidth: 20 }, // Type
        7: { cellWidth: 30 }, // Description
        // 8: { cellWidth: 18, halign: 'center' }, // Image (slightly smaller)
      },
      didDrawCell: function (data) {
        const imageColumnIndex = 8;

        if (
          data.column.index === imageColumnIndex &&
          data.row.section === 'body' &&
          data.row.index < images.length &&
          images[data.row.index]
        ) {
          const imgData = images[data.row.index];
          const cellWidth = data.cell.width;
          const cellHeight = data.cell.height;
          const imgSize = 12; // Smaller image size

          // Center the image in the cell
          const imgX = data.cell.x + cellWidth / 2 - imgSize / 2;
          const imgY = data.cell.y + cellHeight / 2 - imgSize / 2;

          doc.addImage(imgData!, 'JPEG', imgX, imgY, imgSize, imgSize);
        }
      },
      didDrawPage: function (data: any) {
        currentY = data?.cursor?.y + 8; // Smaller space after table
        // Add page number at the bottom right
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

  // Footer (moved outside the loop to ensure it's at the very end)
  doc.setFontSize(8); // Smaller footer font
  doc.setTextColor(150);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()}`,
    14,
    doc.internal.pageSize.height - 10
  );

  doc.save(`${event.title}.pdf`);
};

// Helper function to convert image URL to Base64 (no change needed here)
const toBase64 = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        resolve(dataUrl);
      } catch (err) {
        console.error('Image conversion error', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('Image failed:', url);
      resolve(null);
    };
    img.src = url;
  });
