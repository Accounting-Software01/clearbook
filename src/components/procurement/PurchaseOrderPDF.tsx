
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- TYPE (should match the details page type) ---
interface PurchaseOrderDetails {
    id: number;
    po_number: string;
    supplier_name: string;
    po_date: string;
    expected_delivery_date: string | null;
    currency: string;
    payment_terms: string;
    subtotal: number;
    vat_total: number;
    total_amount: number;
    status: string;
    remarks: string | null;
    items: any[]; // Simplified for this component
}

// --- HELPER ---
const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';

export const PurchaseOrderPDF = (order: PurchaseOrderDetails) => {
    const doc = new jsPDF();

    // 1. HEADER
    // You might want to add a logo here
    // doc.addImage(logo, 'PNG', 14, 15, 40, 10);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Purchase Order', 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`PO Number: ${order.po_number}`, 14, 40);
    doc.text(`Date: ${formatDate(order.po_date)}`, 14, 45);

    // Supplier Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', 14, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(order.supplier_name, 14, 66);


    // 2. TABLE
    const tableColumn = ["Item Description", "Qty", "Unit Price", "Total"];
    const tableRows: any[] = [];

    order.items.forEach(item => {
        const itemData = [
            item.description,
            item.quantity,
            `${order.currency} ${item.unit_price.toFixed(2)}`,
            `${order.currency} ${item.line_total.toFixed(2)}`,
        ];
        tableRows.push(itemData);
    });
    
    // Totals rows
    tableRows.push(["", "", "Subtotal", `${order.currency} ${order.subtotal.toFixed(2)}`]);
    tableRows.push(["", "", "VAT", `${order.currency} ${order.vat_total.toFixed(2)}`]);
    tableRows.push(["", "", "Total", `${order.currency} ${order.total_amount.toFixed(2)}`]);

    (doc as jsPDFWithAutoTable).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        headStyles: { fillColor: [22, 160, 133] }, // Example color
        didDrawCell: (data) => {
            // Style totals rows
            if (data.row.index >= order.items.length) {
                if(data.cell.styles) {
                     data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });
    
    const finalY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY || 180;

    // 3. FOOTER (Remarks, Terms)
    let currentY = finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(order.payment_terms || 'N/A', 14, currentY + 5);

    if (order.remarks) {
        currentY += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Remarks:', 14, currentY);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const remarksLines = doc.splitTextToSize(order.remarks, 180);
        doc.text(remarksLines, 14, currentY + 5);
    }

    // 4. SAVE
    doc.save(`PO_${order.po_number}.pdf`);
};

// Hacky way to extend jsPDF type for autotable
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
}
