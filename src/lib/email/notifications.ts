/**
 * Email Bildirim Sistemi
 * İşletme sahiplerine otomatik bildirimler
 */

import { sendEmail } from './email-service';

interface NotificationData {
  to: string;
  businessName: string;
  placeName: string;
  [key: string]: any;
}

// Yeni yorum bildirimi
export async function sendNewReviewNotification(data: NotificationData & {
  reviewAuthor: string;
  reviewRating: number;
  reviewContent: string;
  reviewLink: string;
}) {
  const subject = `${data.placeName} - Yeni bir değerlendirme aldınız!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yeni Değerlendirme</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e63946, #f4a261); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .review-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .rating { color: #f4a261; font-size: 24px; }
        .button { display: inline-block; padding: 12px 24px; background: #e63946; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yeni Değerlendirme!</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${data.businessName}</strong>,</p>
          <p><strong>${data.placeName}</strong> icin yeni bir degerlendirme aldiniz.</p>
          
          <div class="review-box">
            <div class="rating">${'★'.repeat(data.reviewRating)}${'☆'.repeat(5 - data.reviewRating)}</div>
            <p><strong>${data.reviewAuthor}</strong> yazdi:</p>
            <p style="font-style: italic; color: #555;">"${data.reviewContent}"</p>
          </div>
          
          <p>Yorumu yanitlamak ve tum degerlendirmeleri gormek icin:</p>
          <a href="${data.reviewLink}" class="button">Panelde Goruntule</a>
          
          <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 5px;">
            <p style="margin: 0; color: #2e7d32;"><strong>Ipucu:</strong> Musteri yorumlarina hizli yanit vermeniz isletmenizin gorunurlugunu artirir.</p>
          </div>
        </div>
        <div class="footer">
          <p>Bu e-posta Sanliurfa.com tarafindan otomatik olarak gonderilmistir.</p>
          <p><a href="https://sanliurfa.com">sanliurfa.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: data.to,
    subject,
    html,
  });
}

// Aylik rapor bildirimi
export async function sendMonthlyReport(data: NotificationData & {
  month: string;
  viewCount: number;
  viewChange: number;
  phoneClicks: number;
  directionClicks: number;
  newReviews: number;
  averageRating: number;
  topSearch: string;
  reportLink: string;
}) {
  const subject = `${data.placeName} - ${data.month} Aylik Performans Raporu`;
  
  const changeIcon = data.viewChange >= 0 ? '↑' : '↓';
  const changeClass = data.viewChange >= 0 ? 'change-positive' : 'change-negative';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #264653; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 10px 0; }
        .stat-number { font-size: 32px; font-weight: bold; color: #e63946; }
        .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
        .change-positive { color: #4caf50; }
        .change-negative { color: #f44336; }
        .button { display: inline-block; padding: 12px 24px; background: #e63946; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Aylik Performans Raporu</h1>
          <p>${data.month}</p>
        </div>
        <div class="content">
          <p>Merhaba <strong>${data.businessName}</strong>,</p>
          <p>Iste <strong>${data.placeName}</strong> icin ${data.month} ayi performans ozeti:</p>
          
          <div class="stat-box">
            <div class="stat-number">${data.viewCount.toLocaleString()}</div>
            <div class="stat-label">Goruntulenme</div>
            <div class="${changeClass}">${changeIcon} %${Math.abs(data.viewChange)}</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-number">${data.phoneClicks}</div>
            <div class="stat-label">Telefon Tiklamasi</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-number">${data.directionClicks}</div>
            <div class="stat-label">Yol Tarifi</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-number">${data.newReviews}</div>
            <div class="stat-label">Yeni Yorum</div>
          </div>
          
          <div class="highlight">
            <strong>Ortalama Puan:</strong> ${data.averageRating}/5.0
          </div>
          
          <p><strong>En Populer Arama:</strong> "${data.topSearch}"</p>
          
          <a href="${data.reportLink}" class="button">Detayli Raporu Goruntule</a>
          
          <div style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 5px;">
            <h3 style="margin-top: 0;">Bu Ay One Cikanlar</h3>
            <ul>
              <li>Isletmeniz bu ay ${data.viewCount.toLocaleString()} kisi tarafindan goruntulendi</li>
              <li>${data.phoneClicks} kisi telefon numaranizi aradi</li>
              <li>${data.newReviews} yeni degerlendirme aldiniz</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: data.to,
    subject,
    html,
  });
}

// Hos geldiniz emaili
export async function sendWelcomeEmail(data: NotificationData & {
  loginLink: string;
  tutorialLink: string;
}) {
  const subject = 'Sanliurfa.com a Hos Geldiniz!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e63946, #f4a261); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .step { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .step-number { display: inline-block; width: 30px; height: 30px; background: #e63946; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #e63946; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .tips { background: #e8f5e9; padding: 20px; border-radius: 8px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hos Geldiniz!</h1>
          <p>Sanliurfa.com ailesine katildiniz</p>
        </div>
        <div class="content">
          <p>Merhaba <strong>${data.businessName}</strong>,</p>
          <p><strong>${data.placeName}</strong> isletmeniz Sanliurfa.com da yayina alindi!</p>
          
          <h3>Baslamak icin 3 adim:</h3>
          
          <div class="step">
            <span class="step-number">1</span>
            <strong>Profilinizi Tamamlayin</strong>
            <p>Isletme bilgilerinizi, fotograflarinizi ve calisma saatlerinizi ekleyin.</p>
          </div>
          
          <div class="step">
            <span class="step-number">2</span>
            <strong>Yorumlari Takip Edin</strong>
            <p>Musteri degerlendirmelerini duzenli kontrol edin ve yanitlayin.</p>
          </div>
          
          <div class="step">
            <span class="step-number">3</span>
            <strong>Performansi Izleyin</strong>
            <p>Aylik raporlarla gorunurlugunuzu ve etkilesimlerinizi takip edin.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginLink}" class="button">Panele Giris Yap</a>
            <a href="${data.tutorialLink}" class="button" style="background: #264653;">Nasil Kullanilir?</a>
          </div>
          
          <div class="tips">
            <h4>Basari Ipuclari:</h4>
            <ul>
              <li>Kaliteli fotograflar yukleyin (en az 5 fotograf onerilir)</li>
              <li>Musteri yorumlarina 24 saat icinde yanit verin</li>
              <li>Fiyat bilgilerinizi duzenli guncelleyin</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">Herhangi bir sorunuz olursa <a href="mailto:support@sanliurfa.com">support@sanliurfa.com</a> adresinden bize ulasabilirsiniz.</p>
          
          <p>Basarilar!<br><strong>Sanliurfa.com Ekibi</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: data.to,
    subject,
    html,
  });
}
