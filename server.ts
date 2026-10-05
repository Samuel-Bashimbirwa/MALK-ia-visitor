import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  sendEmail,
  verifySmtpConnection,
  emailOutboxLogs,
  getEffectiveSmtpConfig,
} from "./src/services/mailer";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  province?: string;
  createdAt: string;
  status: "pending" | "transmitted_to_lawyer" | "answered";
  targetRecipient: string;
  mailDelivery?: any;
}

const inquiries: Inquiry[] = [
  {
    id: "MALK-8421",
    name: "Mireille Kasongo",
    email: "mireille.k@example.cd",
    subject: "Orientation juridique",
    message: "Bonjour, je sollicite une assistance juridique concernant des violences conjugales récurrentes à Kinshasa.",
    province: "Kinshasa",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "transmitted_to_lawyer",
    targetRecipient: process.env.ADMIN_EMAIL || "contact@malkia.cd",
  },
  {
    id: "MALK-8422",
    name: "Chantal Mwamba",
    email: "chantal.mwamba@example.cd",
    subject: "Procurez-vous le livre",
    message: "Est-il possible d'obtenir 15 exemplaires du guide pour notre association de jeunes filles à Goma ?",
    province: "Nord-Kivu",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "pending",
    targetRecipient: process.env.ADMIN_EMAIL || "contact@malkia.cd",
  },
];

export const app = express();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "contact@malkia.cd";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRouter = express.Router();

// API Health Check
apiRouter.get("/health", (_req, res) => {
  const config = getEffectiveSmtpConfig();
  res.json({
    status: "ok",
    platform: "MALK'ia RDC Web Platform",
    adminEmail: ADMIN_EMAIL,
    smtpConfigured: config.isConfigured,
    smtpHost: config.host ? `${config.host}:${config.port}` : "Non configuré (mode journal actif)",
    outboxCount: emailOutboxLogs.length,
    timestamp: new Date().toISOString(),
  });
});

// Diagnostic / Diagnostics API
apiRouter.get("/diagnostics", async (_req, res) => {
  const config = getEffectiveSmtpConfig();
  const smtpStatus = await verifySmtpConnection();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    adminEmail: ADMIN_EMAIL,
    smtp: {
      ...smtpStatus,
      host: config.host,
      port: config.port,
      user: config.user,
      secure: config.secure,
    },
    outbox: {
      totalSent: emailOutboxLogs.length,
      logs: emailOutboxLogs,
    },
    inquiriesCount: inquiries.length,
  });
});

// Send a test diagnostic email directly to adminEmail
apiRouter.post("/diagnostics/send-test", async (req, res) => {
  const targetEmail = req.body.email || ADMIN_EMAIL;
  const testResult = await sendEmail({
    to: targetEmail,
    subject: `[Diagnostic MALK'ia RDC] Test de livraison d'e-mail (${new Date().toLocaleTimeString("fr-FR")})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
        <h2 style="color: #B8882C; margin-top: 0;">MALK'ia RDC — Test de diagnostic e-mail</h2>
        <p>Bonjour Samuel,</p>
        <p>Ce message confirme l'exécution du test de diagnostic du système de notification de la plateforme MALK'ia.</p>
        <div style="background: #FFF; padding: 15px; border-radius: 8px; border: 1px solid #E2D9C8; font-size: 14px;">
          <p><strong>Destinataire testé :</strong> ${targetEmail}</p>
          <p><strong>Date & Heure :</strong> ${new Date().toISOString()}</p>
          <p><strong>Mode :</strong> ${process.env.SMTP_HOST ? "SMTP Réseau (" + process.env.SMTP_HOST + ")" : "Simulation Outbox"}</p>
        </div>
        <p style="font-size: 12px; color: #736B5E; margin-top: 20px;">
          Plateforme MALK'ia — « Connaître ses droits, c'est mieux ».
        </p>
      </div>
    `,
    text: `Diagnostic MALK'ia RDC : Test de notification envoyé à ${targetEmail} le ${new Date().toISOString()}`,
  });

  res.json({
    success: testResult.deliveredToSmtp,
    message: testResult.deliveredToSmtp
      ? `E-mail de test expédié avec succès vers ${targetEmail} via SMTP !`
      : testResult.error
      ? `Échec d'expédition SMTP : ${testResult.error}. L'e-mail a été consigné dans le journal de diagnostic ci-dessous.`
      : `Test exécuté. Les variables SMTP ne sont pas encore configurées dans les secrets : l'e-mail a été enregistré dans le journal d'envoi consultable ci-dessous.`,
    result: testResult,
  });
});

// Contact / Questions submission endpoint
apiRouter.post("/questions", async (req, res) => {
  try {
    const { name, email, subject, message, phone, province } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Veuillez renseigner votre nom, adresse e-mail et votre message.",
      });
    }

    const newId = `MALK-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Dispatch real email to Admin
    const adminMailResult = await sendEmail({
      to: ADMIN_EMAIL,
      replyTo: String(email).trim(),
      subject: `[MALK'ia RDC - Nouvelle Question ${newId}] ${subject || "Orientation juridique"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
          <h2 style="color: #1E1C1A; border-bottom: 2px solid #D4A346; padding-bottom: 8px;">
            Nouvelle demande reçue sur MALK'ia RDC
          </h2>
          <p><strong>Numéro de dossier :</strong> ${newId}</p>
          <p><strong>Nom de l'expéditeur :</strong> ${name}</p>
          <p><strong>E-mail :</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Téléphone / WhatsApp :</strong> ${phone || "Non renseigné"}</p>
          <p><strong>Province :</strong> ${province || "Non spécifié"}</p>
          <p><strong>Sujet :</strong> ${subject || "Orientation générale"}</p>
          <div style="margin-top: 15px; padding: 15px; background: #FFFFFF; border-radius: 8px; border: 1px solid #DDD5C5;">
            <h4 style="margin-top: 0; color: #544D42;">Message :</h4>
            <p style="white-space: pre-wrap; color: #22201D; line-height: 1.6;">${message}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #7A7264;">
            Vous pouvez répondre directement à ce message pour contacter l'usagère.
          </p>
        </div>
      `,
      text: `Dossier ${newId} - ${name} (${email}): ${message}`,
    });

    // Dispatch real confirmation email to the user
    await sendEmail({
      to: String(email).trim(),
      subject: `[MALK'ia RDC] Confirmation de votre demande - Dossier ${newId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
          <h2 style="color: #B8882C;">MALK'ia — Droits des Femmes en RDC</h2>
          <p>Bonjour ${name},</p>
          <p>Nous avons bien reçu votre question. Notre équipe juridique et nos bénévoles l'examinent en toute confidentialité.</p>
          <p><strong>Votre numéro de référence :</strong> ${newId}</p>
          <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; border: 1px solid #DDD5C5; margin: 15px 0;">
            <p style="margin: 0; font-size: 13px; color: #544D42;"><strong>Votre message :</strong></p>
            <p style="margin-top: 5px; font-size: 13px; color: #22201D;">${message}</p>
          </div>
          <p style="font-size: 13px; color: #544D42;">
            En cas d'urgence absolue, n'hésitez pas à composer le numéro vert gratuit <strong>122</strong> accessible 24h/24 en RDC.
          </p>
          <p style="font-size: 12px; color: #7A7264; margin-top: 20px;">
            L'équipe MALK'ia RDC — « Connaître ses droits, c'est mieux. »
          </p>
        </div>
      `,
    });

    const newInquiry: Inquiry = {
      id: newId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      subject: subject || "Question générale",
      message: String(message).trim(),
      phone: phone ? String(phone).trim() : undefined,
      province: province ? String(province).trim() : "Non spécifié",
      createdAt: new Date().toISOString(),
      status: "pending",
      targetRecipient: ADMIN_EMAIL,
      mailDelivery: adminMailResult,
    };

    inquiries.unshift(newInquiry);

    return res.status(201).json({
      success: true,
      message: adminMailResult.deliveredToSmtp
        ? "Votre question a été transmise et un e-mail a été expédié à l'administrateur."
        : "Votre question a été enregistrée avec succès. Note de diagnostic : configurez vos accès SMTP pour recevoir le mail directement sur Gmail.",
      referenceCode: newId,
      inquiry: newInquiry,
      deliveryInfo: adminMailResult,
    });
  } catch (err: any) {
    console.error("Error processing question:", err);
    return res.status(500).json({
      error: "Une erreur est survenue lors de l'enregistrement de votre demande.",
    });
  }
});

// Retrieve inquiries (admin/debug or state confirmation)
apiRouter.get("/questions", (_req, res) => {
  res.json({
    success: true,
    total: inquiries.length,
    adminEmail: ADMIN_EMAIL,
    inquiries,
  });
});

// Book order / distribution request endpoint
apiRouter.post("/book-order", async (req, res) => {
  const { name, email, phone, city, format, quantity = 1 } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: "Nom et adresse email requis.",
    });
  }

  const orderId = `LIVRE-${Math.floor(10000 + Math.random() * 90000)}`;

  const mailResult = await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[Malk'ia Guide] Nouvelle commande de livre ${orderId} (${format})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #FAF8F5;">
        <h2>Nouvelle commande du livre Malk'ia</h2>
        <p><strong>N° Commande :</strong> ${orderId}</p>
        <p><strong>Demandeur :</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
        <p><strong>Téléphone :</strong> ${phone || "Non renseigné"}</p>
        <p><strong>Ville :</strong> ${city || "Kinshasa"}</p>
        <p><strong>Format :</strong> ${format}</p>
        <p><strong>Quantité :</strong> ${quantity}</p>
      </div>
    `,
  });

  return res.status(201).json({
    success: true,
    orderId,
    message:
      "Votre demande d'acquisition du guide Malk'ia a été enregistrée avec succès.",
    targetEmail: ADMIN_EMAIL,
    deliveryInfo: mailResult,
  });
});

// Community registration endpoint
apiRouter.post("/community-join", (req, res) => {
  const { name, email, phone, province, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Nom et e-mail requis." });
  }

  console.log(`[Malk'ia Community] New Member: ${name} (${email}) - ${role || "Sympathisante"}`);

  return res.status(201).json({
    success: true,
    message: "Bienvenue dans la communauté Malk'ia ! Vous recevrez le lien du groupe d'entraide.",
  });
});

// Community status proposal endpoint (Manual moderation via email)
apiRouter.post("/status-proposal", async (req, res) => {
  const {
    author = "Anonyme",
    theme = "Sensibilisation",
    message,
    contact = "Non précisé",
    city = "Non spécifié",
  } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Le message ou texte du statut est obligatoire." });
  }

  const cleanAuthor = String(author).trim() || "Membre Anonyme";
  const cleanTheme = String(theme).trim();
  const cleanMessage = String(message).trim();
  const cleanContact = String(contact).trim();

  // Send structured email to enterprise/admin email
  const mailResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[MALK'ia Communauté] Nouvelle proposition de statut : "${cleanTheme}" par ${cleanAuthor}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
        <h2 style="color: #1E1C1A; border-bottom: 2px solid #D4A346; padding-bottom: 8px;">
          Nouvelle proposition de statut / citation communautaire
        </h2>
        <p><strong>Auteur / Pseudo :</strong> ${cleanAuthor}</p>
        <p><strong>Thème :</strong> <span style="background: #E8DCC4; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${cleanTheme}</span></p>
        <p><strong>Contact :</strong> ${cleanContact}</p>
        <p><strong>Ville / Province :</strong> ${city}</p>
        
        <div style="margin-top: 15px; padding: 15px; background: #FFFFFF; border-left: 4px solid #D4A346; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #544D42;">Texte proposé pour le statut :</h4>
          <p style="white-space: pre-wrap; font-size: 15px; color: #1E1C1A; line-height: 1.6; margin: 0; font-style: italic;">
            "${cleanMessage}"
          </p>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: #F1EAE0; border-radius: 6px; font-size: 13px; color: #645D51;">
          💡 <strong>Astuce :</strong> Vous pouvez copier directement ce texte pour le diffuser sur votre statut WhatsApp officiel ou l'ajouter au site !
        </div>
      </div>
    `,
    text: `Nouvelle proposition de statut par ${cleanAuthor} (${cleanContact}) - Thème: ${cleanTheme}\n\n"${cleanMessage}"`,
  });

  return res.status(201).json({
    success: true,
    message: "Merci beaucoup ! Votre proposition a bien été transmise par e-mail à l'équipe MALK'ia. Nous la relirons manuellement pour la diffuser.",
    deliveryInfo: mailResult,
  });
});

// ==========================================
// 48-HOUR QUESTIONNAIRES & TEAM PUBLISHING
// ==========================================
export interface DynamicQuestion {
  id: string;
  question: string;
  type: "boolean" | "options";
  options?: string[];
  correctAnswer: boolean | string;
  explanation: string;
  lawRef: string;
  createdAt: number;
  expiresAt: number; // Exactly 48 hours after creation
  authorName?: string;
}

const initial48hQuestions: DynamicQuestion[] = [
  {
    id: "q-48h-1",
    question: "En RDC, un époux a-t-il le droit d'interdire à son épouse d'exercer une profession ou d'ouvrir un compte bancaire personnel ?",
    type: "boolean",
    correctAnswer: false,
    explanation:
      "L'autorisation maritale a été formellement abolie par la Loi n° 16/008. La femme congolaise mariée dispose désormais de sa pleine capacité civile et juridique.",
    lawRef: "Loi n° 16/008 révisant le Code de la Famille",
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 3600 * 1000,
    authorName: "Équipe Juridique MALK'ia",
  },
  {
    id: "q-48h-2",
    question: "Quel est le délai d'urgence vitale pour recevoir la prise en charge médicale gratuite (kit PEP anti-VIH et soins) après une agression ?",
    type: "options",
    options: ["24 heures", "72 heures", "1 semaine"],
    correctAnswer: "72 heures",
    explanation:
      "La prophylaxie post-exposition (PEP) doit impérativement être administrée dans les 72 heures pour prévenir efficacement la transmission du VIH et d'autres complications.",
    lawRef: "Protocole National de Prise en Charge Médicale VBG en RDC",
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 3600 * 1000,
    authorName: "Équipe Médicale & Urgence MALK'ia",
  },
  {
    id: "q-48h-3",
    question: "La belle-famille a-t-elle le droit d'expulser une veuve et ses orphelins de la maison conjugale à la disparition du mari ?",
    type: "boolean",
    correctAnswer: false,
    explanation:
      "La loi protège expressément le conjoint survivant et ses enfants. Le déguerpissement forcé et la spoliation successorale sont des délits punis par le Code Pénal et le Code de la Famille.",
    lawRef: "Code de la Famille (Articles 758 et suivants)",
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 3600 * 1000,
    authorName: "Équipe Juridique MALK'ia",
  },
];

let dynamicQuestions: DynamicQuestion[] = [...initial48hQuestions];

// 1. Get active 48-Hour questions
apiRouter.get("/quiz-48h", (_req, res) => {
  const now = Date.now();
  // Filter active (expiresAt > now)
  let active = dynamicQuestions.filter((q) => q.expiresAt > now);

  // If all expired, renew default with a fresh 48h window so site never looks empty
  if (active.length === 0) {
    dynamicQuestions = initial48hQuestions.map((q, idx) => ({
      ...q,
      createdAt: now,
      expiresAt: now + (48 - idx * 4) * 3600 * 1000,
    }));
    active = dynamicQuestions;
  }

  const enriched = active.map((q) => {
    const remainingMs = Math.max(0, q.expiresAt - now);
    const remainingHours = Math.floor(remainingMs / (3600 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));

    return {
      ...q,
      remainingMs,
      remainingHours,
      remainingMinutes,
      formattedCountdown: `${remainingHours}h ${remainingMinutes}m`,
    };
  });

  res.json({
    success: true,
    total: enriched.length,
    questions: enriched,
    serverTime: new Date().toISOString(),
  });
});

// 2. Secret endpoint for Team to post new 48H question (Protected by PIN)
apiRouter.post("/admin/quiz-question", async (req, res) => {
  const {
    adminPin,
    question,
    type = "boolean",
    options,
    correctAnswer,
    explanation,
    lawRef = "Lois RDC sur les droits des femmes",
    authorName = "Équipe MALK'ia",
  } = req.body;

  // Verify PIN (default malkia2026, or check environment variable)
  const validPin = process.env.TEAM_PIN || "malkia2026";
  if (!adminPin || String(adminPin).trim() !== validPin) {
    return res.status(403).json({
      error: "Code secret d'équipe invalide. Accès réservé à l'équipe MALK'ia.",
    });
  }

  if (!question || !explanation || correctAnswer === undefined) {
    return res.status(400).json({
      error: "Veuillez renseigner la question, la bonne réponse et l'explication juridique.",
    });
  }

  const now = Date.now();
  const expiresAt = now + 48 * 3600 * 1000; // Strictly 48 hours

  const newQuestion: DynamicQuestion = {
    id: `q-48h-${Date.now()}`,
    question: String(question).trim(),
    type: type === "options" ? "options" : "boolean",
    options: Array.isArray(options) && options.length > 0 ? options : undefined,
    correctAnswer,
    explanation: String(explanation).trim(),
    lawRef: String(lawRef).trim(),
    createdAt: now,
    expiresAt,
    authorName: String(authorName).trim() || "Équipe MALK'ia",
  };

  dynamicQuestions.unshift(newQuestion);

  // Send email to team confirmation
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[MALK'ia Équipe] Nouveau questionnaire 48H mis en ligne`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #FAF8F5; border-radius: 12px; border: 1px solid #E6DDCC;">
        <h2 style="color: #1E1C1A; border-bottom: 2px solid #D4A346; padding-bottom: 8px;">
          Nouveau questionnaire 48H publié sur MALK'ia
        </h2>
        <p><strong>Auteur :</strong> ${newQuestion.authorName}</p>
        <p><strong>Validité :</strong> 48 heures (Expire le : ${new Date(expiresAt).toLocaleString("fr-FR")})</p>
        <div style="background: #FFF; padding: 15px; border-radius: 8px; border: 1px solid #E2D9C8; margin: 15px 0;">
          <h4 style="margin: 0 0 8px 0; color: #1E1C1A;">« ${newQuestion.question} »</h4>
          <p><strong>Réponse exacte :</strong> ${String(newQuestion.correctAnswer)}</p>
          <p><strong>Référence légale :</strong> ${newQuestion.lawRef}</p>
          <p><strong>Explication :</strong> ${newQuestion.explanation}</p>
        </div>
      </div>
    `,
  });

  return res.status(201).json({
    success: true,
    message: "Le questionnaire 48H a été mis en ligne avec succès sur le site !",
    question: newQuestion,
  });
});

// 3. Visitor participates in 48H questionnaire: receives confirmation email & WhatsApp status copy
apiRouter.post("/quiz-participate", async (req, res) => {
  const {
    name,
    email,
    phone,
    countryCode = "CD",
    questionText,
    userAnswer,
    isCorrect,
    explanation,
    lawRef,
    score,
    total,
  } = req.body;

  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: "Adresse email requise pour recevoir la confirmation." });
  }

  const cleanName = String(name || "Chère participante").trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = String(phone || "Non renseigné").trim();
  const statusShareText = `🎯 J'ai répondu au questionnaire 48H sur MALK'ia RDC ! Connais-tu tes droits face aux violences ? Teste ton score toi aussi sur : https://malkia.cd/#communaute #MALKiaRDC`;

  // 1. Send confirmation email to visitor
  const visitorMail = await sendEmail({
    to: cleanEmail,
    subject: `[MALK'ia RDC] Confirmation de votre participation au Défi 48H — Vos Droits`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
        <h2 style="color: #B8882C; margin-top: 0;">MALK'ia — Droits des Femmes en RDC</h2>
        <p>Bonjour ${cleanName},</p>
        <p>Félicitations pour votre engagement ! Vous venez de participer à notre questionnaire de sensibilisation 48H.</p>
        
        <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; border: 1px solid #DDD5C5; margin: 15px 0;">
          <h4 style="margin: 0 0 8px 0; color: #1E1C1A;">Résultat de votre participation :</h4>
          <p><strong>Question :</strong> « ${questionText || "Questionnaire Droits"} »</p>
          <p><strong>Votre réponse :</strong> <span style="font-weight: bold; color: ${isCorrect ? "#15803d" : "#b91c1c"};">${String(userAnswer)} (${isCorrect ? "Correcte ✅" : "Incorrecte ❌"})</span></p>
          ${explanation ? `<p style="margin-top: 10px; font-size: 13px; color: #474034; line-height: 1.5;"><strong>Fondement légal :</strong> ${explanation}</p>` : ""}
          ${lawRef ? `<p style="font-size: 11px; color: #8C6B24; font-weight: bold; text-transform: uppercase;">${lawRef}</p>` : ""}
        </div>

        <div style="background: #E8F5E9; border: 1px solid #A5D6A7; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h4 style="margin: 0 0 5px 0; color: #2E7D32;">📲 Partagez votre résultat sur votre Statut WhatsApp :</h4>
          <p style="font-size: 13px; color: #1B5E20; margin: 0; font-style: italic;">
            "${statusShareText}"
          </p>
        </div>

        <p style="font-size: 12px; color: #7A7264; margin-top: 20px;">
          En cas d'urgence ou de besoin d'accompagnement juridique gratuit en RDC, le numéro vert <strong>122</strong> est accessible 24h/24.<br/>
          L'équipe MALK'ia — « Connaître ses droits, c'est mieux. »
        </p>
      </div>
    `,
    text: `Bonjour ${cleanName}, merci pour votre participation au Défi 48H MALK'ia !\n\nPartagez en statut : "${statusShareText}"`,
  });

  // 2. Notify team about new participant
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[MALK'ia Participation 48H] ${cleanName} (${cleanPhone})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #FAF8F5;">
        <h2>Nouvelle participation au questionnaire 48H</h2>
        <p><strong>Nom :</strong> ${cleanName}</p>
        <p><strong>E-mail :</strong> <a href="mailto:${cleanEmail}">${cleanEmail}</a></p>
        <p><strong>Téléphone mondial :</strong> ${cleanPhone} (Pays: ${countryCode})</p>
        <p><strong>Question :</strong> ${questionText}</p>
        <p><strong>Réponse :</strong> ${String(userAnswer)} (${isCorrect ? "Correcte" : "Incorrecte"})</p>
        <p><strong>Score :</strong> ${score || 1} / ${total || 1}</p>
      </div>
    `,
  });

  return res.status(201).json({
    success: true,
    message: "Votre participation a bien été enregistrée ! Un e-mail de confirmation vous a été envoyé.",
    statusShareText,
    deliveryInfo: visitorMail,
  });
});

// Mount the API Router on both /api and / to support all deployment environments (Local Express, Vercel Serverless, Docker)
app.use("/api", apiRouter);
app.use("/", apiRouter);

async function startServer() {
  // Vite middleware & listening (disabled on Vercel serverless)
  if (process.env.VERCEL !== "1") {
    const PORT = 3000;
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`MALK'ia server listening on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
