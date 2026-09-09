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
    isp: row.querySelector(".isp").value.trim(),
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

    doc.setFillColor(...navy); doc.rect(0, 0, 612, 78, "F");
    doc.setFillColor(...gold); doc.rect(0, 78, 612, 3, "F");
    try { doc.addImage(await loadLogo(), "PNG", 36, 10, 58, 58); } catch (_) {}
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("HOME FRONT SOLUTIONS", 106, 31);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(205, 221, 234);
    doc.text("Commission & payout services", 106, 47);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text("COMMISSION STATEMENT", 570, 31, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(205, 221, 234);
    doc.text(formatDate(statementDate), 570, 47, { align: "right" });

    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...teal); doc.text("PAYABLE TO", 42, 111);
    doc.setTextColor(...navy); doc.setFontSize(19); doc.text(repName, 42, 133);
    doc.setFillColor(233, 240, 247); doc.roundedRect(493, 105, 77, 25, 12, 12, "F");
    doc.setTextColor(...teal); doc.setFontSize(8); doc.text(status.toUpperCase(), 531.5, 121, { align: "center" });

    doc.setFillColor(244, 247, 249); doc.roundedRect(42, 151, 528, 72, 6, 6, "F");
    doc.setDrawColor(220, 229, 236); doc.line(218, 163, 218, 211); doc.line(394, 163, 394, 211);
    const orderLabel = `${orders.length} ${orders.length === 1 ? "ORDER" : "ORDERS"}`;
    doc.setTextColor(...teal); doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text(`GROSS COMMISSION  •  ${orderLabel}`, 61, 174); doc.text("CHARGEBACK RESERVE", 237, 174);
    doc.setTextColor(...navy); doc.setFontSize(17); doc.text(currency.format(total), 61, 200); doc.text(`-${currency.format(reserve)}`, 237, 200);
    doc.setFillColor(...navy); doc.roundedRect(410, 159, 145, 56, 5, 5, "F");
    doc.setTextColor(...gold); doc.setFontSize(7); doc.text("NET PAYOUT", 426, 177);
    doc.setTextColor(255, 255, 255); doc.setFontSize(19); doc.text(currency.format(netPayout), 426, 201);

    doc.autoTable({
      startY: 247,
      head: [["Order #", "Customer", "Activation", "ISP", "Product", "Commission"]],
      body: orders.map((item) => [item.order, item.customer, formatDate(item.activation), item.isp, item.product, currency.format(item.commission)]),
      foot: [["", "", "", "", "GROSS TOTAL", currency.format(total)]],
      theme: "plain",
      margin: { left: 42, right: 42, bottom: 55 },
      headStyles: { fillColor: teal, textColor: 255, fontStyle: "bold", fontSize: 8, cellPadding: 7 },
      bodyStyles: { textColor: navy, fontSize: 8, cellPadding: 7, lineColor: [224, 231, 237], lineWidth: { bottom: .45 } },
      alternateRowStyles: { fillColor: [245, 248, 250] },
      footStyles: { fillColor: [233, 240, 247], textColor: navy, fontStyle: "bold", fontSize: 9, cellPadding: 7 },
      columnStyles: { 0: { cellWidth: 66 }, 1: { cellWidth: 93 }, 2: { cellWidth: 72 }, 3: { cellWidth: 54 }, 4: { cellWidth: 163 }, 5: { cellWidth: 80, halign: "right" } },
      didDrawPage(data) {
        const pageHeight = doc.internal.pageSize.height;
        doc.setDrawColor(218, 228, 236); doc.line(42, pageHeight - 37, 570, pageHeight - 37);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...muted);
        doc.text("HOME FRONT SOLUTIONS  •  COMMISSION STATEMENT", 42, pageHeight - 23);
        doc.text(`Page ${data.pageNumber}`, 570, pageHeight - 23, { align: "right" });
      },
    });

    const lastY = doc.lastAutoTable.finalY + 16;
    if (lastY < 690) {
      doc.setDrawColor(215, 225, 233); doc.setLineWidth(.7); doc.roundedRect(42, lastY, 528, 60, 5, 5, "S");
      doc.setTextColor(...teal); doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("CHARGEBACK HOLD", 56, lastY + 18);
      doc.setTextColor(...navy); doc.setFontSize(10); doc.text(`${orders.length} ${orders.length === 1 ? "order" : "orders"} x ${currency.format(chargebackRate)}`, 56, lastY + 37);
      doc.setFontSize(8); doc.setTextColor(...muted); doc.text("Held against potential order chargebacks", 56, lastY + 51);
      doc.setTextColor(...teal); doc.setFontSize(7); doc.text("AMOUNT PAYABLE", 556, lastY + 18, { align: "right" });
      doc.setTextColor(...navy); doc.setFontSize(16); doc.text(currency.format(netPayout), 556, lastY + 41, { align: "right" });
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
