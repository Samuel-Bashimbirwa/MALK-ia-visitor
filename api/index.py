"""
Backend Serverless Flask pour MALK'ia RDC sur Vercel
Gère les formulaires de questions citoyennes, commandes de guides et diagnostics d'e-mails.
"""

import os
import ssl
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL") or os.environ.get("SMTP_USER") or "samuelbashimbirwa@gmail.com"
SMTP_HOST = os.environ.get("SMTP_HOST") or os.environ.get("SMTP_SERVER") or "smtp.gmail.com"
SMTP_PORT = int(os.environ.get("SMTP_PORT") or 465)
SMTP_USER = os.environ.get("SMTP_USER") or ADMIN_EMAIL
SMTP_PASS = os.environ.get("SMTP_PASS") or os.environ.get("SMTP_PASSWORD") or ""
SMTP_FROM = os.environ.get("SMTP_FROM") or f"MALK'ia RDC <{SMTP_USER}>"
SMTP_SECURE = os.environ.get("SMTP_SECURE", "true").lower() in ("true", "1", "yes")

# Historique en mémoire pour les diagnostics
email_outbox_logs = []
inquiries_db = []


def send_smtp_email(to_email, subject, html_content, text_content=None, reply_to=None):
    """
    Expédie un e-mail via SMTP réel (Gmail ou autre).
    Supporte SSL (port 465) et STARTTLS (port 587).
    """
    timestamp = datetime.utcnow().isoformat()
    log_entry = {
        "id": f"mail_{len(email_outbox_logs) + 1}",
        "to": to_email,
        "subject": subject,
        "timestamp": timestamp,
        "delivered_to_smtp": False,
        "error": None,
    }

    if not SMTP_PASS or not SMTP_USER:
        err_msg = "SMTP_PASS ou SMTP_USER non configuré dans les variables d'environnement Vercel."
        log_entry["error"] = err_msg
        email_outbox_logs.insert(0, log_entry)
        print(f"[MALK'ia Mail] ⚠️ {err_msg}")
        return {"delivered": False, "error": err_msg}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        if reply_to:
            msg["Reply-To"] = reply_to

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        clean_pass = SMTP_PASS.replace(" ", "").strip()
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if SMTP_PORT == 465 or SMTP_SECURE:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=12) as server:
                server.login(SMTP_USER, clean_pass)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(SMTP_USER, clean_pass)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())

        log_entry["delivered_to_smtp"] = True
        email_outbox_logs.insert(0, log_entry)
        print(f"[MALK'ia Mail] ✅ E-mail envoyé avec succès à {to_email}")
        return {"delivered": True, "error": None}

    except Exception as exc:
        error_str = str(exc)
        log_entry["error"] = error_str
        email_outbox_logs.insert(0, log_entry)
        print(f"[MALK'ia Mail] ❌ Échec d'envoi à {to_email} : {error_str}")
        return {"delivered": False, "error": error_str}


# ==========================================
# ROUTES API (Gérées avec et sans préfixe /api)
# ==========================================

def get_health_data():
    return {
        "status": "ok",
        "platform": "MALK'ia Flask Backend (Vercel Serverless)",
        "admin_email": ADMIN_EMAIL,
        "smtp_configured": bool(SMTP_PASS and SMTP_USER),
        "smtp_host": f"{SMTP_HOST}:{SMTP_PORT}",
        "outbox_count": len(email_outbox_logs),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_endpoint():
    return jsonify(get_health_data())


def get_diagnostics_data():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "adminEmail": ADMIN_EMAIL,
        "smtp": {
            "connected": bool(SMTP_PASS and SMTP_USER),
            "configured": bool(SMTP_PASS and SMTP_USER),
            "host": SMTP_HOST,
            "port": SMTP_PORT,
            "user": SMTP_USER,
            "secure": SMTP_SECURE,
        },
        "outbox": {
            "totalSent": len(email_outbox_logs),
            "logs": email_outbox_logs[:20],
        },
        "inquiriesCount": len(inquiries_db),
    }

@app.route("/diagnostics", methods=["GET"])
@app.route("/api/diagnostics", methods=["GET"])
def diagnostics_endpoint():
    return jsonify(get_diagnostics_data())


@app.route("/diagnostics/send-test", methods=["POST"])
@app.route("/api/diagnostics/send-test", methods=["POST"])
def diagnostics_send_test():
    data = request.get_json() or {}
    target_email = data.get("email") or ADMIN_EMAIL
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
      <h2 style="color: #B8882C; margin-top: 0;">MALK'ia RDC — Test de diagnostic e-mail (Flask)</h2>
      <p>Bonjour Samuel,</p>
      <p>Ce message confirme que votre backend Python Flask sur Vercel est parfaitement configuré pour envoyer des e-mails en direct.</p>
      <div style="background: #FFF; padding: 15px; border-radius: 8px; border: 1px solid #E2D9C8; font-size: 14px;">
        <p><strong>Destinataire :</strong> {target_email}</p>
        <p><strong>Date & Heure :</strong> {now_str}</p>
        <p><strong>Serveur SMTP :</strong> {SMTP_HOST}:{SMTP_PORT}</p>
        <p><strong>Expéditeur authentifié :</strong> {SMTP_USER}</p>
      </div>
      <p style="font-size: 12px; color: #736B5E; margin-top: 20px;">
        Plateforme MALK'ia — « Connaître ses droits, c'est mieux ».
      </p>
    </div>
    """
    text_content = f"Test de diagnostic MALK'ia RDC envoyé à {target_email} le {now_str}"

    res = send_smtp_email(target_email, f"[Diagnostic MALK'ia RDC] Test e-mail ({now_str})", html_content, text_content)

    return jsonify({
        "success": res["delivered"],
        "message": "E-mail de test expédié avec succès via SMTP !" if res["delivered"] else f"Échec d'expédition : {res.get('error')}",
        "result": res
    })


@app.route("/questions", methods=["GET", "POST"])
@app.route("/api/questions", methods=["GET", "POST"])
def handle_questions():
    if request.method == "GET":
        return jsonify({
            "success": True,
            "total": len(inquiries_db),
            "adminEmail": ADMIN_EMAIL,
            "inquiries": inquiries_db
        })

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    subject = (data.get("subject") or "Orientation juridique").strip()
    message = (data.get("message") or "").strip()
    phone = (data.get("phone") or "").strip()
    province = (data.get("province") or "Non spécifié").strip()

    if not name or not email or not message:
        return jsonify({"error": "Veuillez renseigner votre nom, adresse e-mail et votre message."}), 400

    new_id = f"MALK-{len(inquiries_db) + 1001}"

    # 1. E-mail à l'administrateur
    admin_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
      <h2 style="color: #1E1C1A; border-bottom: 2px solid #D4A346; padding-bottom: 8px;">
        Nouvelle demande reçue sur MALK'ia RDC
      </h2>
      <p><strong>Numéro de dossier :</strong> {new_id}</p>
      <p><strong>Nom de l'expéditeur :</strong> {name}</p>
      <p><strong>E-mail :</strong> <a href="mailto:{email}">{email}</a></p>
      <p><strong>Téléphone / WhatsApp :</strong> {phone or 'Non renseigné'}</p>
      <p><strong>Province :</strong> {province}</p>
      <p><strong>Sujet :</strong> {subject}</p>
      <div style="margin-top: 15px; padding: 15px; background: #FFFFFF; border-radius: 8px; border: 1px solid #DDD5C5;">
        <h4 style="margin-top: 0; color: #544D42;">Message :</h4>
        <p style="white-space: pre-wrap; color: #22201D; line-height: 1.6;">{message}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #7A7264;">
        Vous pouvez répondre directement à cet e-mail pour contacter la personne.
      </p>
    </div>
    """
    admin_res = send_smtp_email(
        to_email=ADMIN_EMAIL,
        subject=f"[MALK'ia RDC - Nouvelle Question {new_id}] {subject}",
        html_content=admin_html,
        text_content=f"Dossier {new_id} - {name} ({email}) : {message}",
        reply_to=email
    )

    # 2. E-mail de confirmation à la citoyenne
    user_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
      <h2 style="color: #B8882C;">MALK'ia — Droits des Femmes en RDC</h2>
      <p>Bonjour {name},</p>
      <p>Nous avons bien reçu votre question. Notre équipe juridique et nos bénévoles l'examinent en toute confidentialité.</p>
      <p><strong>Votre numéro de référence :</strong> {new_id}</p>
      <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; border: 1px solid #DDD5C5; margin: 15px 0;">
        <p style="margin: 0; font-size: 13px; color: #544D42;"><strong>Votre message :</strong></p>
        <p style="margin-top: 5px; font-size: 13px; color: #22201D;">{message}</p>
      </div>
      <p style="font-size: 13px; color: #544D42;">
        En cas d'urgence absolue, n'hésitez pas à composer le numéro vert gratuit <strong>122</strong> accessible 24h/24 en RDC.
      </p>
      <p style="font-size: 12px; color: #7A7264; margin-top: 20px;">
        L'équipe MALK'ia RDC — « Connaître ses droits, c'est mieux. »
      </p>
    </div>
    """
    send_smtp_email(
        to_email=email,
        subject=f"[MALK'ia RDC] Confirmation de votre demande - Dossier {new_id}",
        html_content=user_html,
        text_content=f"Bonjour {name}, nous avons bien reçu votre demande sous la référence {new_id}."
    )

    inquiry_record = {
        "id": new_id,
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "phone": phone,
        "province": province,
        "createdAt": datetime.utcnow().isoformat(),
        "status": "pending",
        "targetRecipient": ADMIN_EMAIL,
        "mailDelivery": admin_res
    }
    inquiries_db.insert(0, inquiry_record)

    return jsonify({
        "success": True,
        "message": "Votre question a été transmise et un e-mail a été expédié à l'administrateur." if admin_res["delivered"] else "Votre question a été enregistrée avec succès.",
        "referenceCode": new_id,
        "inquiry": inquiry_record,
        "deliveryInfo": admin_res
    }), 201


@app.route("/book-order", methods=["POST"])
@app.route("/api/book-order", methods=["POST"])
def handle_book_order():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    city = (data.get("city") or "Kinshasa").strip()
    fmt = (data.get("format") or "papier").strip()
    quantity = data.get("quantity") or 1

    if not name or not email:
        return jsonify({"error": "Nom et adresse email requis."}), 400

    order_id = f"LIVRE-{len(inquiries_db) + 5001}"
    order_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #FAF8F5;">
      <h2>Nouvelle commande du livre MALK'ia</h2>
      <p><strong>N° Commande :</strong> {order_id}</p>
      <p><strong>Demandeur :</strong> {name} (<a href="mailto:{email}">{email}</a>)</p>
      <p><strong>Téléphone :</strong> {phone or 'Non renseigné'}</p>
      <p><strong>Ville :</strong> {city}</p>
      <p><strong>Format :</strong> {fmt}</p>
      <p><strong>Quantité :</strong> {quantity}</p>
    </div>
    """
    mail_res = send_smtp_email(
        to_email=ADMIN_EMAIL,
        subject=f"[MALK'ia Guide] Nouvelle commande de livre {order_id} ({fmt})",
        html_content=order_html,
        reply_to=email
    )

    return jsonify({
        "success": True,
        "orderId": order_id,
        "message": "Votre demande d'acquisition du guide MALK'ia a été enregistrée avec succès.",
        "targetEmail": ADMIN_EMAIL,
        "deliveryInfo": mail_res
    }), 201


@app.route("/community-join", methods=["POST"])
@app.route("/api/community-join", methods=["POST"])
def handle_community():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    if not name or not email:
        return jsonify({"error": "Nom et e-mail requis."}), 400

    return jsonify({
        "success": True,
        "message": "Bienvenue dans la communauté MALK'ia !"
    }), 201


@app.route("/status-proposal", methods=["POST"])
@app.route("/api/status-proposal", methods=["POST"])
def handle_status_proposal():
    data = request.get_json() or {}
    author = (data.get("author") or "Anonyme").strip() or "Membre Anonyme"
    theme = (data.get("theme") or "Sensibilisation").strip()
    message = (data.get("message") or "").strip()
    contact = (data.get("contact") or "Non précisé").strip()
    city = (data.get("city") or "Non spécifié").strip()

    if not message:
        return jsonify({"error": "Le message ou texte du statut est obligatoire."}), 400

    proposal_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
      <h2 style="color: #1E1C1A; border-bottom: 2px solid #D4A346; padding-bottom: 8px;">
        Nouvelle proposition de statut / citation communautaire
      </h2>
      <p><strong>Auteur / Pseudo :</strong> {author}</p>
      <p><strong>Thème :</strong> <span style="background: #E8DCC4; padding: 2px 8px; border-radius: 4px; font-weight: bold;">{theme}</span></p>
      <p><strong>Contact :</strong> {contact}</p>
      <p><strong>Ville / Province :</strong> {city}</p>
      
      <div style="margin-top: 15px; padding: 15px; background: #FFFFFF; border-left: 4px solid #D4A346; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #544D42;">Texte proposé pour le statut :</h4>
        <p style="white-space: pre-wrap; font-size: 15px; color: #1E1C1A; line-height: 1.6; margin: 0; font-style: italic;">
          "{message}"
        </p>
      </div>

      <div style="margin-top: 20px; padding: 12px; background: #F1EAE0; border-radius: 6px; font-size: 13px; color: #645D51;">
        💡 <strong>Astuce :</strong> Vous pouvez copier directement ce texte pour le diffuser sur votre statut WhatsApp officiel ou l'ajouter au site !
      </div>
    </div>
    """

    mail_res = send_smtp_email(
        to_email=ADMIN_EMAIL,
        subject=f"[MALK'ia Communauté] Nouvelle proposition de statut : \"{theme}\" par {author}",
        html_content=proposal_html,
        text_content=f"Nouvelle proposition de statut par {author} ({contact}) - {theme} :\n\n{message}"
    )

    return jsonify({
        "success": True,
        "message": "Merci beaucoup ! Votre proposition a bien été transmise par e-mail à l'équipe MALK'ia. Nous la relirons manuellement pour la diffuser.",
        "deliveryInfo": mail_res
    }), 201


# ==========================================
# 48-HOUR QUESTIONNAIRES & TEAM PUBLISHING
# ==========================================
import time

dynamic_48h_questions = [
    {
        "id": "q-48h-1",
        "question": "En RDC, un époux a-t-il le droit d'interdire à son épouse d'exercer une profession ou d'ouvrir un compte bancaire personnel ?",
        "type": "boolean",
        "correctAnswer": False,
        "explanation": "L'autorisation maritale a été formellement abolie par la Loi n° 16/008. La femme congolaise mariée dispose désormais de sa pleine capacité civile et juridique.",
        "lawRef": "Loi n° 16/008 révisant le Code de la Famille",
        "createdAt": int(time.time() * 1000),
        "expiresAt": int((time.time() + 48 * 3600) * 1000),
        "authorName": "Équipe Juridique MALK'ia"
    },
    {
        "id": "q-48h-2",
        "question": "Quel est le délai d'urgence vitale pour recevoir la prise en charge médicale gratuite (kit PEP anti-VIH et soins) après une agression ?",
        "type": "options",
        "options": ["24 heures", "72 heures", "1 semaine"],
        "correctAnswer": "72 heures",
        "explanation": "La prophylaxie post-exposition (PEP) doit impérativement être administrée dans les 72 heures pour prévenir efficacement la transmission du VIH.",
        "lawRef": "Protocole National de Prise en Charge Médicale VBG en RDC",
        "createdAt": int(time.time() * 1000),
        "expiresAt": int((time.time() + 48 * 3600) * 1000),
        "authorName": "Équipe Médicale & Urgence MALK'ia"
    }
]

@app.route("/quiz-48h", methods=["GET"])
@app.route("/api/quiz-48h", methods=["GET"])
def get_quiz_48h():
    now_ms = int(time.time() * 1000)
    active = [q for q in dynamic_48h_questions if q.get("expiresAt", 0) > now_ms]
    
    if not active:
        # Reset sample
        for q in dynamic_48h_questions:
            q["createdAt"] = now_ms
            q["expiresAt"] = now_ms + 48 * 3600 * 1000
        active = dynamic_48h_questions

    enriched = []
    for q in active:
        rem_ms = max(0, q["expiresAt"] - now_ms)
        rem_h = rem_ms // (3600 * 1000)
        rem_m = (rem_ms % (3600 * 1000)) // (60 * 1000)
        q_copy = dict(q)
        q_copy["remainingHours"] = rem_h
        q_copy["remainingMinutes"] = rem_m
        q_copy["formattedCountdown"] = f"{rem_h}h {rem_m}m"
        enriched.append(q_copy)

    return jsonify({
        "success": True,
        "total": len(enriched),
        "questions": enriched
    })

@app.route("/admin/quiz-question", methods=["POST"])
@app.route("/api/admin/quiz-question", methods=["POST"])
def post_admin_quiz_question():
    data = request.get_json() or {}
    admin_pin = (data.get("adminPin") or "").strip()
    valid_pin = os.environ.get("TEAM_PIN", "malkia2026")
    
    if admin_pin != valid_pin:
        return jsonify({"error": "Code secret d'équipe invalide. Accès réservé à l'équipe MALK'ia."}), 403

    question = (data.get("question") or "").strip()
    explanation = (data.get("explanation") or "").strip()
    correct_answer = data.get("correctAnswer")
    
    if not question or not explanation or correct_answer is None:
        return jsonify({"error": "Question, réponse exacte et explication requises."}), 400

    now_ms = int(time.time() * 1000)
    new_q = {
        "id": f"q-48h-{now_ms}",
        "question": question,
        "type": data.get("type", "boolean"),
        "options": data.get("options") if isinstance(data.get("options"), list) else None,
        "correctAnswer": correct_answer,
        "explanation": explanation,
        "lawRef": data.get("lawRef", "Lois RDC"),
        "createdAt": now_ms,
        "expiresAt": now_ms + 48 * 3600 * 1000,
        "authorName": data.get("authorName", "Équipe MALK'ia")
    }
    dynamic_48h_questions.insert(0, new_q)
    return jsonify({"success": True, "question": new_q}), 201

@app.route("/quiz-participate", methods=["POST"])
@app.route("/api/quiz-participate", methods=["POST"])
def post_quiz_participate():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    name = (data.get("name") or "Chère participante").strip()
    phone = (data.get("phone") or "Non renseigné").strip()
    country_code = data.get("countryCode", "CD")
    question_text = data.get("questionText", "Questionnaire Droits")
    user_answer = str(data.get("userAnswer", ""))
    is_correct = bool(data.get("isCorrect"))
    explanation = data.get("explanation", "")
    law_ref = data.get("lawRef", "")
    
    if not email:
        return jsonify({"error": "Adresse email requise pour recevoir la confirmation."}), 400

    status_share_text = "🎯 J'ai répondu au questionnaire 48H sur MALK'ia RDC ! Connais-tu tes droits face aux violences ? Teste ton score toi aussi sur : https://malkia.cd/#communaute #MALKiaRDC"
    
    visitor_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E6DDCC; border-radius: 12px; background: #FAF8F5;">
      <h2 style="color: #B8882C;">MALK'ia — Droits des Femmes en RDC</h2>
      <p>Bonjour {name},</p>
      <p>Félicitations pour votre engagement ! Vous venez de participer à notre questionnaire de sensibilisation 48H.</p>
      <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; border: 1px solid #DDD5C5; margin: 15px 0;">
        <h4 style="margin: 0 0 8px 0; color: #1E1C1A;">Résultat de votre participation :</h4>
        <p><strong>Question :</strong> « {question_text} »</p>
        <p><strong>Votre réponse :</strong> <span style="font-weight: bold; color: {'#15803d' if is_correct else '#b91c1c'};">{user_answer} ({'Correcte ✅' if is_correct else 'Incorrecte ❌'})</span></p>
        <p style="margin-top: 10px; font-size: 13px; color: #474034;"><strong>Fondement légal :</strong> {explanation}</p>
        <p style="font-size: 11px; color: #8C6B24; font-weight: bold;">{law_ref}</p>
      </div>
      <div style="background: #E8F5E9; border: 1px solid #A5D6A7; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin: 0 0 5px 0; color: #2E7D32;">📲 Partagez votre résultat sur votre Statut WhatsApp :</h4>
        <p style="font-size: 13px; color: #1B5E20; margin: 0; font-style: italic;">"{status_share_text}"</p>
      </div>
      <p style="font-size: 12px; color: #7A7264; margin-top: 20px;">
        En cas d'urgence, numéro vert gratuit en RDC : <strong>122</strong>.
      </p>
    </div>
    """
    
    send_smtp_email(
        to_email=email,
        subject="[MALK'ia RDC] Confirmation de votre participation au Défi 48H — Vos Droits",
        html_content=visitor_html,
        text_content=f"Bonjour {name}, merci pour votre participation au Défi 48H MALK'ia !\n\nPartagez en statut : {status_share_text}"
    )

    send_smtp_email(
        to_email=ADMIN_EMAIL,
        subject=f"[MALK'ia Participation 48H] {name} ({phone})",
        html_content=f"<p>Nouvelle participation : {name}, Email: {email}, Téléphone mondial: {phone} (Pays: {country_code}). Question: {question_text}. Réponse: {user_answer}</p>"
    )

    return jsonify({
        "success": True,
        "message": "Participation enregistrée et email expédié avec succès.",
        "statusShareText": status_share_text
    }), 201



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Serveur Flask démarré sur le port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
