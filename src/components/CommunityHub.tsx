import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Share2,
  Copy,
  Check,
  Send,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Award,
  RotateCcw,
  Mail,
  HeartHandshake,
  ShieldAlert,
  Clock,
  Lock,
  Phone,
  ArrowRight,
} from "lucide-react";
import { ModalType } from "../types";
import { InternationalPhoneInput } from "./InternationalPhoneInput";

interface CommunityHubProps {
  onOpenModal: (type: ModalType) => void;
}

export interface QuizQuestion48H {
  id: string;
  question: string;
  type: "boolean" | "options";
  options?: string[];
  correctAnswer: boolean | string;
  explanation: string;
  lawRef: string;
  createdAt: number;
  expiresAt: number;
  formattedCountdown?: string;
  authorName?: string;
}

const DEFAULT_QUESTIONS: QuizQuestion48H[] = [
  {
    id: "q-48h-1",
    question: "En RDC, un époux a-t-il le droit d'interdire à son épouse de travailler ou d'ouvrir un compte bancaire personnel ?",
    type: "boolean",
    correctAnswer: false,
    explanation:
      "L'autorisation maritale a été formellement abolie par la Loi n° 16/008. La femme congolaise mariée dispose désormais de sa pleine capacité civile et juridique.",
    lawRef: "Loi n° 16/008 révisant le Code de la Famille",
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 3600 * 1000,
    formattedCountdown: "47h 58m",
    authorName: "Équipe Juridique MALK'ia",
  },
  {
    id: "q-48h-2",
    question: "Quel est le délai d'urgence vitale pour recevoir la prise en charge médicale gratuite (kit PEP anti-VIH et soins) après une agression ?",
    type: "options",
    options: ["24 heures", "72 heures", "1 semaine"],
    correctAnswer: "72 heures",
    explanation:
      "La prophylaxie post-exposition (PEP) doit impérativement être administrée dans les 72 heures pour prévenir efficacement la transmission du VIH et d'autres complications médicales.",
    lawRef: "Protocole National de Prise en Charge Médicale VBG en RDC",
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 3600 * 1000,
    formattedCountdown: "46h 12m",
    authorName: "Équipe Médicale & Urgence MALK'ia",
  },
  {
    id: "q-48h-3",
    question: "La belle-famille a-t-elle le droit coutumier d'expulser une veuve de la maison conjugale à la disparition de son conjoint ?",
    type: "boolean",
    correctAnswer: false,
    explanation:
      "La loi protège expressément le conjoint survivant et ses enfants. L'expulsion forcée et le déguerpissement coutumier sont des infractions pénales punies par la loi congolaise.",
    lawRef: "Code de la Famille (Articles 758 et suivants)",
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 3600 * 1000,
    formattedCountdown: "45h 30m",
    authorName: "Équipe Juridique MALK'ia",
  },
];

const PRESET_STATUSES = [
  {
    id: "loi-travail",
    theme: "Droit & Autonomie",
    badge: "Code de la Famille",
    text: "En RDC, la loi n° 16/008 garantit à chaque femme le droit de travailler et de gérer ses propres finances sans demander l'autorisation de quiconque. Connaître ses droits, c'est mieux ! 🇨🇩 #MALKiaRDC #DroitsDesFemmes",
  },
  {
    id: "urgence-72h",
    theme: "Urgence Santé",
    badge: "Protocole 72h",
    text: "URGENCE VBG : Face à une agression, chaque minute compte. Les soins médicaux préventifs et kits PEP sont gratuits dans les 72 heures. Brisons le silence, sauvons des vies ! #MALKiaRDC #Urgence72h",
  },
  {
    id: "solidarite-espoir",
    theme: "Solidarité",
    badge: "Force & Espoir",
    text: "À toutes nos sœurs qui traversent l'épreuve dans le silence : vous n'êtes pas coupables, vous n'êtes pas seules. Des juristes et des femmes engagées sont à vos côtés. Numéro vert RDC : 122. #MALKiaRDC",
  },
  {
    id: "heritage-veuve",
    theme: "Succession",
    badge: "Justice",
    text: "La coutume ne peut pas effacer la loi : aucune belle-famille ne peut priver une veuve et ses orphelins de leur toit. Vos droits de succession sont protégés. #MALKiaRDC #StopAuxAbus",
  },
];

export const CommunityHub: React.FC<CommunityHubProps> = ({ onOpenModal }) => {
  const [activeTab, setActiveTab] = useState<"quiz" | "status">("quiz");

  // Dynamic 48H Questions
  const [questions, setQuestions] = useState<QuizQuestion48H[]>(DEFAULT_QUESTIONS);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // User answering state
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Participation confirmation form state
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");
  const [participantCountry, setParticipantCountry] = useState("CD");
  const [submittingParticipation, setSubmittingParticipation] = useState(false);
  const [participationConfirmed, setParticipationConfirmed] = useState(false);
  const [participationMsg, setParticipationMsg] = useState<string | null>(null);
  const [whatsappShareStatusText, setWhatsappShareStatusText] = useState<string>("");

  // Status generator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status proposal form state (Manual moderation via email)
  const [author, setAuthor] = useState("");
  const [theme, setTheme] = useState("Droits de la femme");
  const [message, setMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("Kinshasa");
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Fetch dynamic 48H questions
  const load48hQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const res = await fetch("/api/quiz-48h");
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.warn("Using offline curated questions", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    load48hQuestions();
  }, []);

  const currentQuestion = questions[currentQuestionIndex] || DEFAULT_QUESTIONS[0];

  const handleSelectAnswer = (ans: boolean | string) => {
    if (hasAnswered) return;
    setSelectedAnswer(ans);
    setHasAnswered(true);

    const isCorrect = ans === currentQuestion.correctAnswer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setParticipationConfirmed(false);
    setParticipationMsg(null);
  };

  // Submit email for reception confirmation
  const handleConfirmAndSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantEmail.trim()) return;

    setSubmittingParticipation(true);
    try {
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      const res = await fetch("/api/quiz-participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: participantName.trim() || "Chère participante",
          email: participantEmail.trim(),
          phone: participantPhone.trim(),
          countryCode: participantCountry,
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          userAnswer: selectedAnswer,
          isCorrect,
          explanation: currentQuestion.explanation,
          lawRef: currentQuestion.lawRef,
          score,
          total: questions.length,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setParticipationConfirmed(true);
        setParticipationMsg(
          data.message ||
            "Félicitations ! Votre participation a bien été enregistrée et un e-mail de confirmation détaillé vous a été envoyé."
        );
        const text = `🎯 J'ai participé au questionnaire 48H sur MALK'ia RDC (Droits des femmes) ! Connais-tu tes droits face aux violences ? Viens tester : ${window.location.origin}/#communaute #MALKiaRDC`;
        setWhatsappShareStatusText(text);
      } else {
        throw new Error(data.error || "Erreur de transmission");
      }
    } catch (err: any) {
      setParticipationConfirmed(true);
      setParticipationMsg(
        "Votre participation a été enregistrée sur le site. Vous pouvez maintenant publier votre statut WhatsApp !"
      );
      setWhatsappShareStatusText(
        `🎯 Défi 48H MALK'ia RDC : je soutiens les droits des femmes face aux violences ! Testez vos droits : ${window.location.origin}/#communaute`
      );
    } finally {
      setSubmittingParticipation(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareStatusWhatsApp = (text: string) => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Submit community proposal via Email
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setProposalError("Veuillez saisir votre message ou citation pour le statut.");
      return;
    }

    setSubmittingProposal(true);
    setProposalError(null);
    setProposalSuccess(null);

    try {
      const res = await fetch("/api/status-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: author.trim() || "Anonyme",
          theme,
          message: message.trim(),
          contact: contactPhone.trim(),
          city,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible d'envoyer la proposition.");
      }

      setProposalSuccess(
        data.message ||
          "Votre proposition a été transmise à notre équipe par e-mail. Nous allons la relire manuellement avant publication !"
      );
      setMessage("");
      setAuthor("");
      setContactPhone("");
    } catch (err: any) {
      setProposalError(
        err.message || "Erreur de connexion. Votre proposition n'a pas pu être envoyée."
      );
    } finally {
      setSubmittingProposal(false);
    }
  };

  return (
    <section id="communaute" className="py-16 lg:py-24 bg-[#FAF7F0] border-t border-[#EAE3D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EDE2] border border-[#E5DCCB] text-[#696154] text-xs font-semibold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-[#D4A346]" />
            <span>Défi 48H & Sensibilisation Active</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E1C1A]">
            Questionnaires Éphémères 48H & Statuts WhatsApp
          </h2>

          <p className="text-[#595247] text-base sm:text-lg leading-relaxed">
            Chaque questionnaire reste actif pendant <strong>exactement 48 heures</strong>.
            Répondez, recevez un e-mail de confirmation avec vos résultats et publiez votre badge
            directement en statut WhatsApp !
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-[#E6DECE] shadow-xs">
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "quiz"
                  ? "bg-[#1E1C1A] text-white shadow-xs"
                  : "text-[#544D42] hover:text-[#1E1C1A] hover:bg-[#F8F5EE]"
              }`}
            >
              <Award className="w-4 h-4 text-[#D4A346]" />
              <span>1. Défi Questionnaire 48H</span>
            </button>

            <button
              onClick={() => setActiveTab("status")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "status"
                  ? "bg-[#1E1C1A] text-white shadow-xs"
                  : "text-[#544D42] hover:text-[#1E1C1A] hover:bg-[#F8F5EE]"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#D4A346]" />
              <span>2. Statuts WhatsApp & Fiches</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: 48-HOUR DYNAMIC QUESTIONNAIRE */}
        {/* ==================================================== */}
        {activeTab === "quiz" && (
          <div className="max-w-3xl mx-auto">
            {!quizFinished ? (
              <div className="bg-white rounded-3xl border border-[#E8DEC8] p-6 sm:p-10 shadow-sm relative overflow-hidden animate-in fade-in duration-300">
                {/* 48H Badge & Countdown */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-[#F2ECE0]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF3E6] border border-[#E4D7C0] text-[#8C6B24] text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#D4A346]" />
                      <span>Validité : 48 Heures</span>
                    </span>
                    <span className="text-xs text-[#736B5E] font-medium">
                      Question {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8882C] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#DDD5C5]">
                    <span>⏳ Expire dans :</span>
                    <span>{currentQuestion.formattedCountdown || "48h 00m"}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-[#F1EAE0] rounded-full overflow-hidden mb-8">
                  <div
                    className="h-full bg-[#D4A346] transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Question text */}
                <div className="min-h-[90px] flex items-center mb-8">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1E1C1A] leading-snug">
                    « {currentQuestion.question} »
                  </h3>
                </div>

                {/* Options / Boolean */}
                {currentQuestion.type === "boolean" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => handleSelectAnswer(true)}
                      disabled={hasAnswered}
                      className={`p-4 rounded-2xl border text-base font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
                        hasAnswered
                          ? currentQuestion.correctAnswer === true
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                            : selectedAnswer === true
                            ? "bg-rose-50 border-rose-400 text-rose-800"
                            : "bg-[#FAF8F5] border-[#E8DEC8] text-[#736B5E] opacity-60"
                          : "bg-[#FAF8F5] hover:bg-[#FAF4E8] border-[#DDD5C5] hover:border-[#D4A346] text-[#1E1C1A]"
                      }`}
                    >
                      <span>VRAI</span>
                      {hasAnswered && currentQuestion.correctAnswer === true && (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {hasAnswered &&
                        selectedAnswer === true &&
                        currentQuestion.correctAnswer !== true && (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                    </button>

                    <button
                      onClick={() => handleSelectAnswer(false)}
                      disabled={hasAnswered}
                      className={`p-4 rounded-2xl border text-base font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
                        hasAnswered
                          ? currentQuestion.correctAnswer === false
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                            : selectedAnswer === false
                            ? "bg-rose-50 border-rose-400 text-rose-800"
                            : "bg-[#FAF8F5] border-[#E8DEC8] text-[#736B5E] opacity-60"
                          : "bg-[#FAF8F5] hover:bg-[#FAF4E8] border-[#DDD5C5] hover:border-[#D4A346] text-[#1E1C1A]"
                      }`}
                    >
                      <span>FAUX</span>
                      {hasAnswered && currentQuestion.correctAnswer === false && (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {hasAnswered &&
                        selectedAnswer === false &&
                        currentQuestion.correctAnswer !== false && (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {currentQuestion.options?.map((opt) => {
                      const isCorrect = opt === currentQuestion.correctAnswer;
                      const isSelected = opt === selectedAnswer;

                      return (
                        <button
                          key={opt}
                          onClick={() => handleSelectAnswer(opt)}
                          disabled={hasAnswered}
                          className={`p-4 rounded-2xl border text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            hasAnswered
                              ? isCorrect
                                ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                                : isSelected
                                ? "bg-rose-50 border-rose-400 text-rose-800"
                                : "bg-[#FAF8F5] border-[#E8DEC8] text-[#736B5E] opacity-60"
                              : "bg-[#FAF8F5] hover:bg-[#FAF4E8] border-[#DDD5C5] hover:border-[#D4A346] text-[#1E1C1A]"
                          }`}
                        >
                          <span>{opt}</span>
                          {hasAnswered && isCorrect && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {hasAnswered && isSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Feedback box */}
                {hasAnswered && (
                  <div className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E6DECE] animate-in fade-in duration-300 space-y-2 mb-6">
                    <div className="flex items-center gap-2">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Exact ! Vous maîtrisez vos droits.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Attention aux fausses croyances !</span>
                        </div>
                      )}
                      <span className="text-[11px] font-semibold text-[#8C6B24] ml-auto uppercase tracking-wider">
                        {currentQuestion.lawRef}
                      </span>
                    </div>

                    <p className="text-sm text-[#474034] leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Next button */}
                {hasAnswered && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-3 bg-[#D4A346] hover:bg-[#C29337] text-[#1E1C1A] font-bold rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      {currentQuestionIndex + 1 === questions.length
                        ? "Voir mon score & Recevoir ma confirmation →"
                        : "Question suivante →"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Quiz Finished: Email confirmation and WhatsApp status copy */
              <div className="bg-white rounded-3xl border border-[#E8DEC8] p-6 sm:p-10 shadow-sm space-y-6 animate-in zoom-in-95 duration-400">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-[#FAF3E6] border border-[#E4D7C0] flex items-center justify-center mx-auto text-[#B8882C] shadow-inner">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E1C1A]">
                    {score === questions.length
                      ? "🏆 Bravo, Ambassadrice des Droits !"
                      : "✨ Merci pour votre participation !"}
                  </h3>
                  <p className="text-base font-bold text-[#8C6B24]">
                    Votre résultat : {score} sur {questions.length} réponses exactes
                  </p>
                </div>

                {!participationConfirmed ? (
                  /* Form to receive email confirmation */
                  <div className="bg-[#FAF8F5] p-5 sm:p-7 rounded-2xl border border-[#E6DECE] space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[#1E1C1A] flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#B8882C]" />
                        <span>Recevoir votre confirmation officielle par e-mail</span>
                      </h4>
                      <p className="text-xs text-[#736B5E]">
                        Renseignez vos coordonnées pour recevoir votre accusé de réception officiel
                        avec vos explications de droits et votre texte prêt pour statut WhatsApp.
                      </p>
                    </div>

                    <form onSubmit={handleConfirmAndSendEmail} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#544D42] mb-1">
                            Votre nom ou pseudo
                          </label>
                          <input
                            type="text"
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                            placeholder="Ex: Marie"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#544D42] mb-1">
                            Votre e-mail <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={participantEmail}
                            onChange={(e) => setParticipantEmail(e.target.value)}
                            placeholder="nom@exemple.com"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-white text-sm"
                          />
                        </div>
                      </div>

                      {/* International Phone Input for all countries */}
                      <div>
                        <label className="block text-xs font-semibold text-[#544D42] mb-1">
                          Numéro de téléphone / WhatsApp (tous pays du monde)
                        </label>
                        <InternationalPhoneInput
                          value={participantPhone}
                          onChange={(num, country) => {
                            setParticipantPhone(num);
                            setParticipantCountry(country);
                          }}
                          placeholder="81 234 5678"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingParticipation}
                        className="w-full py-3 bg-[#1E1C1A] hover:bg-[#332E27] text-white font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        {submittingParticipation ? (
                          <span>Envoi de votre e-mail de confirmation...</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-[#D4A346]" />
                            <span>Confirmer et recevoir mon mail de résultat</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Success & WhatsApp Status Publishing */
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">E-mail de confirmation expédié !</p>
                        <p className="text-xs text-emerald-700 mt-0.5">{participationMsg}</p>
                      </div>
                    </div>

                    {/* Ready WhatsApp status card */}
                    <div className="p-5 rounded-2xl bg-[#E8F5E9] border border-[#A5D6A7] space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1B5E20] flex items-center gap-1.5">
                          <Share2 className="w-4 h-4" />
                          <span>Prêt pour votre Statut WhatsApp :</span>
                        </span>
                        <span className="text-[11px] text-[#2E7D32] font-semibold">1 clic pour diffuser</span>
                      </div>

                      <p className="text-xs sm:text-sm text-[#1B5E20] font-medium italic bg-white/80 p-3 rounded-xl border border-[#C8E6C9]">
                        "{whatsappShareStatusText}"
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <button
                          onClick={() => handleShareStatusWhatsApp(whatsappShareStatusText)}
                          className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Publier sur mon statut WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleCopyText("status-result", whatsappShareStatusText)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#A5D6A7] text-[#1B5E20] font-semibold text-sm rounded-xl cursor-pointer hover:bg-[#F1F8E9]"
                        >
                          {copiedId === "status-result" ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span>Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleRestartQuiz}
                    className="inline-flex items-center gap-2 text-xs text-[#736B5E] hover:text-[#1E1C1A] font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recommencer le questionnaire</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: WHATSAPP STATUS GENERATOR & PROPOSAL FORM */}
        {/* ==================================================== */}
        {activeTab === "status" && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {/* 1. Preset ready-to-share status cards */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#1E1C1A]">
                    Fiches & Statuts prêts à diffuser
                  </h3>
                  <p className="text-xs sm:text-sm text-[#736B5E]">
                    Copiez en 1 clic ou partagez directement sur votre statut WhatsApp pour éveiller
                    votre entourage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PRESET_STATUSES.map((item) => {
                  const isCopied = copiedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-[#E6DECE] p-6 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#FAF4E8] text-[#8C6B24] border border-[#EBDDC3]">
                            {item.theme}
                          </span>
                          <span className="text-xs text-[#9E9587] font-medium">
                            {item.badge}
                          </span>
                        </div>

                        <p className="text-sm sm:text-base text-[#24211D] leading-relaxed font-medium bg-[#FCFBF8] p-4 rounded-2xl border border-[#F1EBE0] italic">
                          "{item.text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#F1EAE0]">
                        <button
                          onClick={() => handleCopyText(item.id, item.text)}
                          className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                            isCopied
                              ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                              : "bg-[#FAF7F0] hover:bg-[#F2ECE0] border-[#E0D7C6] text-[#3B362F]"
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span>Copié dans le presse-papier !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-[#8C6B24]" />
                              <span>Copier le texte</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleShareStatusWhatsApp(item.text)}
                          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white transition-all shadow-xs cursor-pointer"
                          title="Partager directement sur WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Proposal Form : Send to enterprise email for manual review */}
            <div className="bg-white rounded-3xl border border-[#E6DECE] p-6 sm:p-10 shadow-sm">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF4E8] border border-[#EADFCB] flex items-center justify-center text-[#B8882C] mx-auto">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#1E1C1A]">
                    ✍️ Proposer un Statut ou une Pensée pour la Communauté
                  </h3>
                  <p className="text-xs sm:text-sm text-[#595247]">
                    Chaque proposition est transmise directement par e-mail à l'équipe MALK'ia.
                    Nous la relisons manuellement pour la diffuser dans nos statuts officiels et inspirer
                    d'autres femmes en RDC.
                  </p>
                </div>

                {proposalSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Proposition envoyée avec succès !</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{proposalSuccess}</p>
                    </div>
                  </div>
                )}

                {proposalError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-sm flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Attention</p>
                      <p className="text-xs text-rose-700 mt-0.5">{proposalError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitProposal} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                        Votre nom ou pseudo (facultatif)
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Ex: Mireille K. ou Anonyme"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm text-[#1E1C1A] focus:outline-hidden focus:ring-2 focus:ring-[#D4A346]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                        Thème du statut
                      </label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm text-[#1E1C1A] focus:outline-hidden focus:ring-2 focus:ring-[#D4A346]"
                      >
                        <option value="Droits de la femme">⚖️ Droits de la femme & Lois</option>
                        <option value="Soutien & Espoir">🕊️ Soutien & Parole d'encouragement</option>
                        <option value="Témoignage court">🌟 Récit de courage & Résilience</option>
                        <option value="Stop aux abus">🛡️ Déconstruction d'un abus / VBG</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                      Votre texte de sensibilisation / statut <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Écrivez ici le message, conseil ou réflexion à partager avec nos sœurs..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm text-[#1E1C1A] focus:outline-hidden focus:ring-2 focus:ring-[#D4A346]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                        Votre WhatsApp ou téléphone (tous pays)
                      </label>
                      <InternationalPhoneInput
                        value={contactPhone}
                        onChange={(num) => setContactPhone(num)}
                        placeholder="81 234 5678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                        Ville / Province
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm text-[#1E1C1A] focus:outline-hidden focus:ring-2 focus:ring-[#D4A346]"
                      >
                        <option value="Kinshasa">Kinshasa</option>
                        <option value="Goma">Goma (Nord-Kivu)</option>
                        <option value="Bukavu">Bukavu (Sud-Kivu)</option>
                        <option value="Lubumbashi">Lubumbashi (Haut-Katanga)</option>
                        <option value="Kisangani">Kisangani (Tshopo)</option>
                        <option value="Matadi">Matadi (Kongo-Central)</option>
                        <option value="Autre pays / Diaspora">Autre province ou Diaspora</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-[11px] text-[#7A7264] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#8C6B24]" />
                      <span>Reçu à malk'ia@h-justicia.com • Modération manuelle</span>
                    </p>

                    <button
                      type="submit"
                      disabled={submittingProposal}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E1C1A] hover:bg-[#332F2A] text-white font-semibold text-sm rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {submittingProposal ? (
                        <span>Transmission par e-mail...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-[#D4A346]" />
                          <span>Envoyer la proposition</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Discreet Team Publishing Link for the MALK'ia team */}
        <div className="mt-12 text-center pt-6 border-t border-[#EAE3D5]/60">
          <button
            onClick={() => onOpenModal("team-editor")}
            className="inline-flex items-center gap-2 text-xs text-[#8C8373] hover:text-[#1E1C1A] transition-colors cursor-pointer p-2 rounded-lg hover:bg-[#F2ECE0]"
            title="Réservé aux membres de l'équipe MALK'ia pour publier des questionnaires 48H"
          >
            <Lock className="w-3.5 h-3.5 text-[#B8882C]" />
            <span>Accès Équipe : Rédiger une question active 48H</span>
          </button>
        </div>
      </div>
    </section>
  );
};
