# Home Front Solutions Commission Statement Builder

A static, browser-only tool that creates branded commission statement PDFs. It accepts a representative name, statement date/status, a configurable chargeback hold per deal, and any number of order rows containing order number, customer, activation date, ISP, product, and commission. ISP defaults to Kinetic. Each PDF shows gross commission, chargeback reserve, and net payout.

## Privacy

All entered information stays in the browser. The tool does not submit or store customer data on a server.

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/commission-statement-tool/`.

## Host on GitHub Pages

The included GitHub Actions workflow deploys the site whenever `main` is updated. In the repository's **Settings → Pages**, set the source to **GitHub Actions**. The tool will then be available at the Pages URL shown in the deployment.

The tool uses jsPDF and AutoTable from jsDelivr, so an internet connection is required when the page first loads.
