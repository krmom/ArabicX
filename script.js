class Navigation {
  constructor() {
    this.toggle = document.getElementById('navToggle');
    this.list = document.getElementById('navList');

    if (!this.toggle || !this.list) return;

    this.toggle.addEventListener('click', () => this.toggleMenu());

    this.list.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => this.closeMenu());
    });
  }

  toggleMenu() {
    const isOpen = this.list.classList.toggle('is-open');
    this.toggle.setAttribute('aria-expanded', String(isOpen));
  }

  closeMenu() {
    this.list.classList.remove('is-open');
    this.toggle.setAttribute('aria-expanded', 'false');
  }
}


class PaymentProcessor {
  validate({ cardName, cardNumber, cardExpiry, cardCvc }) {
    const digitsOnly = (cardNumber || '').replace(/\s+/g, '');

    if (!cardName || cardName.trim().length < 2) {
      return {
        ok: false,
        message: 'Bitte geben Sie den Namen auf der Karte ein.'
      };
    }

    if (!/^\d{13,19}$/.test(digitsOnly)) {
      return {
        ok: false,
        message: 'Die Kartennummer ist ungültig.'
      };
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry || '')) {
      return {
        ok: false,
        message: 'Bitte geben Sie das Ablaufdatum im Format MM/JJ ein.'
      };
    }

    if (!/^\d{3,4}$/.test(cardCvc || '')) {
      return {
        ok: false,
        message: 'Der Sicherheitscode (CVC) ist ungültig.'
      };
    }

    return { ok: true };
  }

  async confirmPayment(amount) {
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
      ok: true,
      transactionId: 'ARX-' + Date.now().toString(36).toUpperCase(),
      amount,
      confirmedAt: new Date()
    };
  }
}


class InvoiceGenerator {
  constructor() {
    this.invoiceCounter = 1042;
  }

  buildInvoiceNumber() {
    this.invoiceCounter += 1;

    return `AX-${new Date().getFullYear()}-${this.invoiceCounter}`;
  }

  create(booking, payment) {
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4'
    });

    const invoiceNumber = this.buildInvoiceNumber();
    const dateStr = payment.confirmedAt.toLocaleDateString('de-DE');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ArabicX', 48, 64);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text(
      'Staatlich geprüfter Dolmetscher und Übersetzer Deutsch-Arabisch',
      48,
      82
    );

    doc.text(
      'Musterstraße 12, 93047 Regensburg',
      48,
      96
    );

    doc.text(
      'kontakt@arabicx.de · 0941 123 456 78',
      48,
      110
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Rechnung', 400, 64);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text(
      `Rechnungsnummer: ${invoiceNumber}`,
      400,
      82
    );

    doc.text(
      `Rechnungsdatum: ${dateStr}`,
      400,
      96
    );

    doc.text(
      `Transaktions-ID: ${payment.transactionId}`,
      400,
      110
    );

    doc.setDrawColor(190, 175, 140);
    doc.line(48, 130, 547, 130);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rechnungsempfänger', 48, 155);

    doc.setFont('helvetica', 'normal');

    doc.text(
      booking.fullName || '-',
      48,
      172
    );

    doc.text(
      booking.email || '-',
      48,
      186
    );

    if (booking.phone) {
      doc.text(
        booking.phone,
        48,
        200
      );
    }

    const tableTop = 240;

    doc.setFont('helvetica', 'bold');

    doc.text('Leistung', 48, tableTop);
    doc.text('Termin', 320, tableTop);
    doc.text('Betrag', 500, tableTop, {
      align: 'right'
    });

    doc.setDrawColor(20, 23, 31);

    doc.line(
      48,
      tableTop + 8,
      547,
      tableTop + 8
    );

    doc.setFont('helvetica', 'normal');

    doc.text(
      booking.serviceType || '-',
      48,
      tableTop + 28
    );

    doc.text(
      booking.apptDate || 'nach Vereinbarung',
      320,
      tableTop + 28
    );

    doc.text(
      `${payment.amount.toFixed(2)} €`,
      500,
      tableTop + 28,
      {
        align: 'right'
      }
    );

    doc.line(
      48,
      tableTop + 50,
      547,
      tableTop + 50
    );

    doc.setFont('helvetica', 'bold');

    doc.text(
      'Gesamtbetrag (inkl. USt.)',
      320,
      tableTop + 72
    );

    doc.text(
      `${payment.amount.toFixed(2)} €`,
      500,
      tableTop + 72,
      {
        align: 'right'
      }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text(
      'Betrag wurde per Kartenzahlung beglichen. Vielen Dank für Ihr Vertrauen.',
      48,
      tableTop + 110
    );

    doc.text(
      'ArabicX · Öffentlich bestellt und allgemein beeidigt · USt-IdNr. DE000000000',
      48,
      780
    );

    return {
      doc,
      invoiceNumber
    };
  }
}


class BookingWizard {
  constructor() {
    this.form = document.getElementById('bookingForm');

    if (!this.form) return;

    this.steps = Array.from(
      this.form.querySelectorAll('.form-step')
    );

    this.progressSteps = Array.from(
      document.querySelectorAll('.progress-step')
    );

    this.errorEl = document.getElementById('formError');
    this.summaryCard = document.getElementById('summaryCard');
    this.confirmationPanel =
      document.getElementById('confirmationPanel');

    this.currentStep = 1;
    this.data = {};

    this.payment = new PaymentProcessor();
    this.invoices = new InvoiceGenerator();

    this.form.addEventListener(
      'click',
      (event) => this.handleClick(event)
    );
  }

  handleClick(event) {
    const action = event.target.dataset
      ? event.target.dataset.action
      : null;

    if (!action) return;

    event.preventDefault();

    this.setError('');

    if (action === 'next') {
      this.goNext();
    }

    if (action === 'back') {
      this.goBack();
    }

    if (action === 'pay') {
      this.processPayment();
    }
  }

  setError(message) {
    this.errorEl.textContent = message;
  }

  goNext() {
    if (
      this.currentStep === 1 &&
      !this.validateStepOne()
    ) {
      return;
    }

    if (this.currentStep === 2) {
      this.renderSummary();
    }

    this.goToStep(this.currentStep + 1);
  }

  goBack() {
    this.goToStep(this.currentStep - 1);
  }

  goToStep(stepNumber) {
    this.currentStep = stepNumber;

    this.steps.forEach((step) => {
      step.classList.toggle(
        'is-active',
        Number(step.dataset.step) === stepNumber
      );
    });

    this.progressSteps.forEach((step) => {
      const n = Number(step.dataset.step);

      step.classList.toggle(
        'is-active',
        n === stepNumber
      );

      step.classList.toggle(
        'is-done',
        n < stepNumber
      );
    });
  }

  validateStepOne() {
    const fullName =
      this.form.fullName.value.trim();

    const email =
      this.form.email.value.trim();

    const serviceSelect =
      this.form.serviceType;

    const serviceType =
      serviceSelect.value;

    if (!fullName) {
      this.setError(
        'Bitte geben Sie Ihren vollständigen Namen ein.'
      );

      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      this.setError(
        'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
      );

      return false;
    }

    if (!serviceType) {
      this.setError(
        'Bitte wählen Sie eine Leistung aus.'
      );

      return false;
    }

    const selectedOption =
      serviceSelect.options[
        serviceSelect.selectedIndex
      ];

    this.data = {
      fullName,
      email,
      phone: this.form.phone.value.trim(),
      serviceType,
      price: Number(
        selectedOption.dataset.price || 0
      ),
      apptDate: this.form.apptDate.value,
      notes: this.form.notes.value.trim()
    };

    return true;
  }

  renderSummary() {
    const d = this.data;

    const dateLabel = d.apptDate
      ? new Date(d.apptDate)
          .toLocaleDateString('de-DE')
      : 'nach Vereinbarung';

    this.summaryCard.innerHTML = `
      <dl>
        <dt>Name</dt>
        <dd>${this.escape(d.fullName)}</dd>

        <dt>E-Mail</dt>
        <dd>${this.escape(d.email)}</dd>

        <dt>Leistung</dt>
        <dd>${this.escape(d.serviceType)}</dd>

        <dt>Termin</dt>
        <dd>${this.escape(dateLabel)}</dd>
      </dl>

      <div class="summary-total">
        <span>Gesamtbetrag</span>
        <span>${d.price.toFixed(2)} €</span>
      </div>
    `;
  }

  escape(str) {
    const div = document.createElement('div');

    div.textContent = str;

    return div.innerHTML;
  }

  async processPayment() {
    const cardData = {
      cardName: this.form.cardName.value.trim(),
      cardNumber: this.form.cardNumber.value.trim(),
      cardExpiry: this.form.cardExpiry.value.trim(),
      cardCvc: this.form.cardCvc.value.trim()
    };

    const validation =
      this.payment.validate(cardData);

    if (!validation.ok) {
      this.setError(validation.message);
      return;
    }

    const payButton =
      this.form.querySelector(
        '[data-action="pay"]'
      );

    payButton.disabled = true;

    payButton.textContent =
      'Zahlung wird bestätigt …';

    try {
      const result =
        await this.payment.confirmPayment(
          this.data.price
        );

      const {
        doc,
        invoiceNumber
      } = this.invoices.create(
        this.data,
        result
      );

      this.lastInvoiceDoc = doc;
      this.lastInvoiceNumber =
        invoiceNumber;

      this.renderConfirmation(
        result,
        invoiceNumber
      );

      this.goToStep(4);

    } catch (err) {

      this.setError(
        'Die Zahlung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut.'
      );

    } finally {

      payButton.disabled = false;

      payButton.textContent =
        'Zahlung bestätigen';
    }
  }

  renderConfirmation(
    result,
    invoiceNumber
  ) {
    this.confirmationPanel.innerHTML = `
      <h3>Zahlung bestätigt</h3>

      <p>
        Vielen Dank,
        ${this.escape(this.data.fullName)}.
        Ihre Zahlung über
        ${result.amount.toFixed(2)} €
        wurde bestätigt
        (Beleg-Nr.
        ${this.escape(result.transactionId)}).
      </p>

      <p>
        Rechnung
        ${this.escape(invoiceNumber)}
        wurde erstellt und wird an
        ${this.escape(this.data.email)}
        gesendet, sobald das Postfach
        angebunden ist.
        Bis dahin können Sie die Rechnung
        direkt herunterladen.
      </p>

      <button
        type="button"
        class="btn btn-primary"
        id="downloadInvoice"
      >
        Rechnung als PDF herunterladen
      </button>
    `;

    document
      .getElementById('downloadInvoice')
      .addEventListener(
        'click',
        () => {
          this.lastInvoiceDoc.save(
            `Rechnung-${this.lastInvoiceNumber}.pdf`
          );
        }
      );
  }
}


document.addEventListener(
  'DOMContentLoaded',
  () => {
    new Navigation();
    new BookingWizard();
  }
);
