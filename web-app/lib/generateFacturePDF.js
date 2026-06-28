// lib/generateFacturePDF.js
// Dépendance : npm install jspdf
// Usage : import { generateFacturePDF } from '@/lib/generateFacturePDF';

import { jsPDF } from 'jspdf';

/**
 * @param {Object} invoice  — données de la facture (depuis Supabase ou form)
 * @param {Object} prestataire — { nom, logo (base64), ice, adresse, tel }
 *
 * Champs attendus dans `invoice` :
 *   num_facture, created_at, date_echeance,
 *   emetteur_nom, emetteur_adresse, emetteur_tel, emetteur_ice, logo_preview,
 *   destinataire_nom, destinataire_email, destinataire_adresse,
 *   facture (array de lignes : { description, quantite, prix_unitaire, total }),
 *   montant_ht, montant_tva, montant_ttc, notes,
 *   reservation : { client : { nom, email } }
 */
export function generateFacturePDF(invoice, prestataire = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ── Couleurs & constantes ──────────────────────────────────────────────────
  const ACCENT   = [19, 1, 131];   // #130183
  const LIGHT    = [240, 242, 255];
  const GRAY     = [100, 100, 110];
  const DARKGRAY = [40, 40, 50];
  const WHITE    = [255, 255, 255];
  const PAGE_W   = 210;
  const PAGE_H   = 297;
  const ML       = 15;   // margin left
  const MR       = 15;   // margin right
  const CW       = PAGE_W - ML - MR; // content width = 180

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (n) => (parseFloat(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  // Wrap texte long en plusieurs lignes
  const splitText = (text, maxW, size) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(String(text || ''), maxW);
  };

  // ── Données ───────────────────────────────────────────────────────────────
  const emetteurNom     = invoice.emetteur_nom     || prestataire.nom     || '';
  const emetteurAdresse = invoice.emetteur_adresse || prestataire.adresse || '';
  const emetteurTel     = invoice.emetteur_tel     || prestataire.tel     || '';
  const emetteurIce     = invoice.emetteur_ice     || prestataire.ice     || '';
  const logo            = invoice.logo_preview     || prestataire.logo    || null;

  const destNom     = invoice.destinataire_nom     || invoice.reservation?.client?.nom   || '';
  const destEmail   = invoice.destinataire_email   || invoice.reservation?.client?.email || '';
  const destAdresse = invoice.destinataire_adresse || '';

  const lignes      = Array.isArray(invoice.facture) ? invoice.facture : [];
  const montantHT   = parseFloat(invoice.montant_ht)  || 0;
  const montantTVA  = parseFloat(invoice.montant_tva) || 0;
  const montantTTC  = parseFloat(invoice.montant_ttc) || 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 1. BANDEAU EN-TÊTE (rectangle pleine largeur)
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 38, 'F');

  // Titre "FACTURE" en blanc
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...WHITE);
  doc.text('FACTURE', ML, 23);

  // Numéro & date sous le titre
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${invoice.num_facture || '—'}`, ML, 30);
  doc.text(`Émise le ${fmtDate(invoice.created_at)}`, ML, 35);

  // ── Logo (haut droite) ────────────────────────────────────────────────────
  if (logo) {
    try {
      // Détecter le format depuis le base64
      let format = 'JPEG';
      if (logo.startsWith('data:image/png'))  format = 'PNG';
      if (logo.startsWith('data:image/webp')) format = 'WEBP';
      doc.addImage(logo, format, PAGE_W - MR - 38, 4, 38, 28, undefined, 'FAST');
    } catch (e) {
      // logo non chargeable, on ignore
    }
  } else if (emetteurNom) {
    // Fallback : nom entreprise stylisé
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(emetteurNom, PAGE_W - MR, 20, { align: 'right', maxWidth: 60 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. BLOC ÉMETTEUR + DESTINATAIRE (côte à côte)
  // ══════════════════════════════════════════════════════════════════════════
  let y = 48;
  const colW = (CW - 8) / 2; // largeur de chaque bloc (8 = gap)

  // — Émetteur (gauche) —
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, colW, 48, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  doc.text('DE', ML + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARKGRAY);
  doc.text(emetteurNom || '—', ML + 5, y + 14, { maxWidth: colW - 10 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let ey = y + 21;
  if (emetteurAdresse) {
    const lines = splitText(emetteurAdresse, colW - 10, 8.5);
    doc.text(lines, ML + 5, ey);
    ey += lines.length * 4.5;
  }
  if (emetteurTel) { doc.text(`Tél : ${emetteurTel}`, ML + 5, ey); ey += 5; }
  if (emetteurIce) { doc.text(`ICE : ${emetteurIce}`, ML + 5, ey); }

  // — Destinataire (droite) —
  const dx = ML + colW + 8;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(dx, y, colW, 48, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  doc.text('À', dx + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARKGRAY);
  doc.text(destNom || '—', dx + 5, y + 14, { maxWidth: colW - 10 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let dy = y + 21;
  if (destEmail)   { doc.text(destEmail,   dx + 5, dy); dy += 5; }
  if (destAdresse) {
    const lines = splitText(destAdresse, colW - 10, 8.5);
    doc.text(lines, dx + 5, dy);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MÉTADONNÉES (date d'échéance + éventuellement réservation)
  // ══════════════════════════════════════════════════════════════════════════
  y += 54;

  // Ligne séparatrice légère
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);

  const meta = [];
  if (invoice.date_echeance) meta.push(`Échéance : ${fmtDate(invoice.date_echeance)}`);
  if (invoice.reservation?.titre) meta.push(`Réf. prestation : ${invoice.reservation.titre}`);

  if (meta.length > 0) {
    doc.text(meta.join('     •     '), ML, y);
    y += 8;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. TABLEAU DES PRESTATIONS
  // ══════════════════════════════════════════════════════════════════════════
  y += 2;

  // En-tête tableau
  const COL = {
    desc: { x: ML,           w: 85 },
    qty:  { x: ML + 85,      w: 18 },
    pu:   { x: ML + 85 + 18, w: 35 },
    tot:  { x: ML + 85 + 18 + 35, w: CW - 85 - 18 - 35 },
  };

  doc.setFillColor(...ACCENT);
  doc.rect(ML, y, CW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('Description',   COL.desc.x + 3, y + 5.5);
  doc.text('Qté',           COL.qty.x  + 3, y + 5.5);
  doc.text('P.U. (MAD)',    COL.pu.x   + 3, y + 5.5);
  doc.text('Total (MAD)',   COL.tot.x  + COL.tot.w - 3, y + 5.5, { align: 'right' });

  y += 8;

  // Lignes du tableau
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  lignes.forEach((l, i) => {
    const rowH = 8;
    const bg = i % 2 === 0 ? WHITE : [247, 247, 252];
    doc.setFillColor(...bg);
    doc.rect(ML, y, CW, rowH, 'F');

    doc.setTextColor(...DARKGRAY);
    // Description peut être longue
    const descLines = splitText(l.description || '', COL.desc.w - 6, 8.5);
    doc.text(descLines, COL.desc.x + 3, y + 5.5);

    doc.setTextColor(...GRAY);
    doc.text(String(l.quantite ?? 1), COL.qty.x + 3, y + 5.5);
    doc.text(fmt(l.prix_unitaire).replace(' MAD', ''), COL.pu.x + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARKGRAY);
    doc.text(fmt(l.total).replace(' MAD', ''), COL.tot.x + COL.tot.w - 3, y + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Si description multi-lignes, agrandir la ligne
    const extraH = Math.max(0, (descLines.length - 1)) * 4;
    y += rowH + extraH;
  });

  // Bordure bas du tableau
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PAGE_W - MR, y);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. BLOC TOTAUX (aligné à droite)
  // ══════════════════════════════════════════════════════════════════════════
  y += 8;
  const totW  = 80;
  const totX  = PAGE_W - MR - totW;
  const totLH = 7;

  const drawTotalRow = (label, value, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...ACCENT);
      doc.rect(totX - 2, y - 5, totW + 2, totLH + 1, 'F');
      doc.setTextColor(...WHITE);
    } else {
      doc.setTextColor(...GRAY);
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.text(label, totX + 2, y);
    doc.text(value, totX + totW - 1, y, { align: 'right' });
    y += totLH;
  };

  drawTotalRow('Montant HT',  fmt(montantHT));
  drawTotalRow('TVA',         fmt(montantTVA));
  y += 2; // espace avant TTC
  drawTotalRow('TOTAL TTC',   fmt(montantTTC), true, true);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. NOTES / CONDITIONS DE PAIEMENT
  // ══════════════════════════════════════════════════════════════════════════
  if (invoice.notes) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...ACCENT);
    doc.text('CONDITIONS DE PAIEMENT', ML, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    const noteLines = splitText(invoice.notes, CW, 8.5);
    doc.text(noteLines, ML, y);
    y += noteLines.length * 4.5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. PIED DE PAGE
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...ACCENT);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);

  const footerParts = [emetteurNom, emetteurTel, emetteurIce ? `ICE : ${emetteurIce}` : ''].filter(Boolean);
  doc.text(footerParts.join('   |   '), PAGE_W / 2, PAGE_H - 5.5, { align: 'center' });

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const filename = `Facture_${invoice.num_facture || 'export'}.pdf`;
  doc.save(filename);
}