const rows = document.querySelector("#orderRows");
const template = document.querySelector("#orderRowTemplate");
const addButton = document.querySelector("#addOrder");
const generateButton = document.querySelector("#generatePdf");
const message = document.querySelector("#message");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

document.querySelector("#statementDate").valueAsDate = new Date();
document.querySelector("#chargebackRate").addEventListener("input", updateSummary);

function addOrder(values = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  Object.entries(values).forEach(([name, value]) => {
    const input = row.querySelector(`.${name}`);
    if (input) input.value = value;
  });
  row.querySelector(".remove").addEventListener("click", () => {
    row.remove();
    if (!rows.children.length) addOrder();
    updateSummary();
  });
  row.querySelector(".commission").addEventListener("input", updateSummary);
  rows.append(row);
  updateSummary();
}

function readOrders() {
  return [...rows.querySelectorAll("tr")].map((row) => ({
    order: row.querySelector(".order-number").value.trim(),
    customer: row.querySelector(".customer").value.trim(),
    activation: row.querySelector(".activation").value,
    product: row.querySelector(".product").value.trim(),
    commission: Number(row.querySelector(".commission").value || 0),
  }));
}

function updateSummary() {
  const orders = readOrders();
  const gross = orders.reduce((sum, item) => sum + item.commission, 0);
  const reserve = orders.length * Number(document.querySelector("#chargebackRate").value || 0);
  document.querySelector("#orderCount").textContent = String(orders.length);
  document.querySelector("#commissionTotal").textContent = currency.format(gross);
  document.querySelector("#chargebackTotal").textContent = `−${currency.format(reserve)}`;
  document.querySelector("#netPayout").textContent = currency.format(gross - reserve);
}

function formatDate(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

function slug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "representative";
}

async function loadLogo() {
  const image = document.querySelector(".masthead img");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

async function generatePdf() {
  message.textContent = "";
  const required = [...document.querySelectorAll("input[required]")];
  const invalid = required.find((input) => !input.value.trim() || !input.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    invalid.focus();
    message.textContent = "Please complete every field before downloading.";
    return;
  }
  if (!window.jspdf?.jsPDF) {
    message.textContent = "The PDF library did not load. Check your connection and try again.";
    return;
  }

  generateButton.disabled = true;
  generateButton.textContent = "Building PDF…";
  try {
    const repName = document.querySelector("#repName").value.trim();
    const statementDate = document.querySelector("#statementDate").value;
    const status = document.querySelector("#statementStatus").value;
    const chargebackRate = Number(document.querySelector("#chargebackRate").value || 0);
    const orders = readOrders();
    const total = orders.reduce((sum, item) => sum + item.commission, 0);
    const reserve = orders.length * chargebackRate;
    const netPayout = total - reserve;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const navy = [11, 37, 64];
    const teal = [49, 94, 104];
    const gold = [245, 185, 66];
    const muted = [90, 107, 118];

    doc.setFillColor(...navy); doc.rect(0, 0, 612, 96, "F");
    doc.setFillColor(...gold); doc.rect(0, 96, 612, 4, "F");
    try { doc.addImage(await loadLogo(), "PNG", 42, 13, 70, 70); } catch (_) {}
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("HOME FRONT SOLUTIONS", 128, 39);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(205, 221, 234);
    doc.text("Customer acquisition from first click to completed install.", 128, 57);

    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("Commission Statement", 42, 142);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...muted);
    doc.text(`Prepared for: ${repName}`, 42, 164);
    doc.text(`Statement date: ${formatDate(statementDate)}`, 250, 164);
    doc.text(`Status: ${status}`, 468, 164);

    doc.setFillColor(244, 247, 249); doc.roundedRect(42, 184, 528, 62, 5, 5, "F");
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(String(orders.length), 96, 210, { align: "center" }); doc.text(currency.format(total), 245, 210, { align: "center" }); doc.text(`−${currency.format(reserve)}`, 390, 210, { align: "center" }); doc.text(currency.format(netPayout), 520, 210, { align: "center" });
    doc.setFontSize(7.5); doc.setTextColor(...teal); doc.text("ORDERS", 96, 229, { align: "center" }); doc.text("GROSS COMMISSION", 245, 229, { align: "center" }); doc.text("CHARGEBACK RESERVE", 390, 229, { align: "center" }); doc.text("NET PAYOUT", 520, 229, { align: "center" });

    doc.autoTable({
      startY: 268,
      head: [["Order #", "Customer", "Activation", "Product", "Commission"]],
      body: orders.map((item) => [item.order, item.customer, formatDate(item.activation), item.product, currency.format(item.commission)]),
      foot: [["", "", "", "GRAND TOTAL", currency.format(total)]],
      theme: "grid",
      margin: { left: 42, right: 42, bottom: 55 },
      headStyles: { fillColor: teal, textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: navy, fontSize: 8, cellPadding: 6, lineColor: [218, 228, 236], lineWidth: .5 },
      alternateRowStyles: { fillColor: [245, 248, 250] },
      footStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 9 },
      columnStyles: { 0: { cellWidth: 68 }, 1: { cellWidth: 105 }, 2: { cellWidth: 78 }, 3: { cellWidth: 191 }, 4: { cellWidth: 86, halign: "right" } },
      didDrawPage(data) {
        const pageHeight = doc.internal.pageSize.height;
        doc.setDrawColor(218, 228, 236); doc.line(42, pageHeight - 37, 570, pageHeight - 37);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...muted);
        doc.text("HOME FRONT SOLUTIONS  •  COMMISSION STATEMENT", 42, pageHeight - 23);
        doc.text(`Page ${data.pageNumber}`, 570, pageHeight - 23, { align: "right" });
      },
    });

    const lastY = doc.lastAutoTable.finalY + 18;
    if (lastY < 690) {
      doc.setFillColor(244, 247, 249); doc.roundedRect(42, lastY, 528, 66, 5, 5, "F");
      doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Chargeback Reserve", 55, lastY + 19);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...muted);
      doc.text(`${orders.length} deals × ${currency.format(chargebackRate)} held per deal`, 55, lastY + 37);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...navy); doc.text(`Reserve held: ${currency.format(reserve)}`, 557, lastY + 20, { align: "right" }); doc.text(`Net payout: ${currency.format(netPayout)}`, 557, lastY + 39, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...muted);
      doc.text("Reserve is retained against potential chargebacks and is not included in the current net payout.", 55, lastY + 54);
    }
    if (lastY + 82 < 730) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...muted);
      doc.text("This statement reflects qualifying orders pending final validation. Commissions are subject to activation verification, cancellations, chargebacks, and applicable compensation terms.", 42, lastY + 82, { maxWidth: 528 });
    }
    doc.save(`${slug(repName)}-commission-statement-${statementDate}.pdf`);
    message.textContent = `PDF created for ${repName}: ${currency.format(netPayout)} net after ${currency.format(reserve)} reserve.`;
  } catch (error) {
    console.error(error);
    message.textContent = "The PDF could not be created. Please try again.";
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Download branded PDF";
  }
}

addButton.addEventListener("click", () => addOrder());
generateButton.addEventListener("click", generatePdf);
addOrder();
