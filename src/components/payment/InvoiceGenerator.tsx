import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at: string | null;
  bookings?: {
    invoice_number?: string;
    class_sessions: {
      session_date: string;
      classes: {
        name: string;
        level: string;
      };
    };
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

export const generateInvoice = (payment: Payment, type: 'invoice' | 'receipt') => {
  const currentDate = new Date();
  const sessionDate = payment.bookings?.class_sessions?.session_date 
    ? new Date(payment.bookings.class_sessions.session_date)
    : currentDate;

  const documentNumber = type === 'invoice' 
    ? payment.bookings?.invoice_number || `INV-${format(currentDate, 'yyyy-MM')}-${payment.id.slice(0, 6).toUpperCase()}`
    : `REC-${format(currentDate, 'yyyy-MM')}-${payment.id.slice(0, 6).toUpperCase()}`;

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'moncash': return 'MonCash';
      case 'check': return 'Chèque';
      case 'card': return 'Carte Bancaire';
      default: return method;
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${type === 'invoice' ? 'Facture' : 'Reçu'} - ${documentNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0ea5e9;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 10px;
        }
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #0ea5e9;
          margin: 10px 0;
        }
        .document-title {
          font-size: 24px;
          font-weight: bold;
          margin: 20px 0;
          color: ${type === 'invoice' ? '#dc2626' : '#16a34a'};
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-section h3 {
          color: #0ea5e9;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .details-table th,
        .details-table td {
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
        }
        .details-table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .total-section {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .total-amount {
          font-size: 20px;
          font-weight: bold;
          color: ${type === 'invoice' ? '#dc2626' : '#16a34a'};
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          background-color: ${payment.status === 'paid' ? '#dcfce7' : '#fef3c7'};
          color: ${payment.status === 'paid' ? '#166534' : '#92400e'};
        }
        @media print {
          body { print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">AQUA D'OR</div>
        <p>Centre de Natation & École de Nage</p>
        <p>📍 Port-au-Prince, Haïti | 📞 +509 XXXX-XXXX</p>
      </div>

      <div class="document-title">
        ${type === 'invoice' ? 'FACTURE' : 'REÇU'} N° ${documentNumber}
        <span class="status-badge">${payment.status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}</span>
      </div>

      <div class="info-grid">
        <div class="info-section">
          <h3>Informations Client</h3>
          <p><strong>Nom:</strong> ${payment.profiles.full_name}</p>
          <p><strong>Email:</strong> ${payment.profiles.email}</p>
        </div>
        
        <div class="info-section">
          <h3>Informations Document</h3>
          <p><strong>Date d'émission:</strong> ${format(currentDate, 'dd MMMM yyyy', { locale: fr })}</p>
          ${type === 'receipt' && payment.paid_at ? 
            `<p><strong>Date de paiement:</strong> ${format(new Date(payment.paid_at), 'dd MMMM yyyy', { locale: fr })}</p>` 
            : ''
          }
          <p><strong>Méthode de paiement:</strong> ${getPaymentMethodName(payment.payment_method)}</p>
        </div>
      </div>

      <table class="details-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Date du cours</th>
            <th>Niveau</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${payment.bookings?.class_sessions?.classes?.name || 'Cours de natation'}</td>
            <td>${format(sessionDate, 'dd MMMM yyyy à HH:mm', { locale: fr })}</td>
            <td>${payment.bookings?.class_sessions?.classes?.level || 'N/A'}</td>
            <td>${payment.amount} ${payment.currency}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>TOTAL ${type === 'invoice' ? 'À PAYER' : 'PAYÉ'}:</span>
          <span class="total-amount">${payment.amount} ${payment.currency}</span>
        </div>
      </div>

      ${type === 'invoice' ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Instructions de paiement:</strong></p>
          ${payment.payment_method === 'cash' ? 
            '<p>• Veuillez apporter le montant en espèces lors de votre arrivée au centre.</p>' :
            payment.payment_method === 'check' ?
            '<p>• Veuillez apporter votre chèque lors de votre arrivée au centre.</p>' :
            payment.payment_method === 'moncash' ?
            '<p>• Vous recevrez les instructions MonCash par email ou SMS.</p>' :
            '<p>• Veuillez contacter le centre pour finaliser votre paiement.</p>'
          }
        </div>
      ` : `
        <div style="background-color: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>✅ Paiement confirmé</strong></p>
          <p>Merci pour votre paiement. Ce reçu confirme la réception de votre paiement.</p>
        </div>
      `}

      <div class="footer">
        <p>Ce document a été généré automatiquement le ${format(currentDate, 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
        <p>AQUA D'OR - Centre de Natation & École de Nage</p>
        <p>Pour toute question, contactez-nous à info@aquador.ht</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing/saving
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  }
};