import React, { useState, useEffect } from "react";
import {
  Lock,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  AlertCircle,
  ShieldCheck,
  Eye,
  Trash2,
} from "lucide-react";

interface TeamQuestionModalProps {
  onClose: () => void;
  onQuestionAdded?: () => void;
}

export const TeamQuestionModal: React.FC<TeamQuestionModalProps> = ({
  onClose,
  onQuestionAdded,
}) => {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Form states
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<"boolean" | "options">("boolean");
  const [optionsStr, setOptionsStr] = useState("24 heures, 72 heures, 1 semaine");
  const [booleanAnswer, setBooleanAnswer] = useState<boolean>(false);
  const [selectedOptionAnswer, setSelectedOptionAnswer] = useState("72 heures");
  const [explanation, setExplanation] = useState("");
  const [lawRef, setLawRef] = useState("Loi n° 16/008 révisant le Code de la Famille");
  const [authorName, setAuthorName] = useState("Équipe Juridique MALK'ia");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active questions list
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);

  const fetchActive = async () => {
    try {
      const res = await fetch("/api/quiz-48h");
      const data = await res.json();
      if (data.success) {
        setActiveQuestions(data.questions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Check if already authenticated in sessionStorage
    const saved = sessionStorage.getItem("malkia_team_auth");
    if (saved === "true") {
      setIsAuthenticated(true);
      fetchActive();
    }
  }, []);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pin.trim() === "malkia2026") {
      setIsAuthenticated(true);
      sessionStorage.setItem("malkia_team_auth", "true");
      fetchActive();
    } else {
      setPinError("Code PIN incorrect. Veuillez vérifier avec l'équipe MALK'ia.");
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !explanation.trim()) {
      setErrorMsg("Veuillez renseigner la question et l'explication juridique.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const optionsList =
      type === "options"
        ? optionsStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const finalAnswer = type === "boolean" ? booleanAnswer : selectedOptionAnswer;

    try {
      const res = await fetch("/api/admin/quiz-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: "malkia2026",
          question: question.trim(),
          type,
          options: optionsList,
          correctAnswer: finalAnswer,
          explanation: explanation.trim(),
          lawRef: lawRef.trim(),
          authorName: authorName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la publication.");
      }

      setSuccessMsg(
        "Questionnaire publié avec succès ! Il sera actif sur le site pendant exactement 48 heures."
      );
      setQuestion("");
      setExplanation("");
      fetchActive();
      if (onQuestionAdded) onQuestionAdded();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la publication.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#FAF3E6] border border-[#E6DCC8] flex items-center justify-center text-[#B8882C]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif text-2xl font-bold text-[#1E1C1A]">
            Espace Équipe MALK'ia — Publication 48H
          </h3>
          <p className="text-xs text-[#736B5E]">
            Rédigez et publiez directement des questions de sensibilisation actives pendant 48 heures
          </p>
        </div>
      </div>

      {!isAuthenticated ? (
        /* Pin Code Protection */
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2D9C8] max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FAF5EB] text-[#8C6B24] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-lg text-[#1E1C1A]">Accès Privé Équipe</h4>
            <p className="text-xs text-[#736B5E] mt-1">
              Cette interface est strictement réservée à l'équipe MALK'ia pour injecter des
              questionnaires sur le site.
            </p>
          </div>

          {pinError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {pinError}
            </div>
          )}

          <form onSubmit={handleVerifyPin} className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Entrez le code secret d'équipe..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#DDD5C5] text-center text-sm font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#D4A346]"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-[#1E1C1A] hover:bg-[#332E27] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Déverrouiller l'espace rédaction
            </button>
          </form>
        </div>
      ) : (
        /* Editor Interface */
        <div className="space-y-6">
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Succès !</p>
                <p className="text-xs mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Erreur</p>
                <p className="text-xs mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handlePublish} className="bg-white p-6 rounded-2xl border border-[#E6DECE] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE0]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C6B24] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#D4A346]" />
                <span>Règle d'application : 48 Heures précises</span>
              </span>
              <span className="text-[11px] text-[#736B5E] bg-[#FAF5EB] px-2.5 py-1 rounded-full">
                Statut : Équipe authentifiée
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                Intitulé de la question de sensibilisation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: En RDC, la dot donne-t-elle un droit de propriété absolu sur l'épouse ?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm text-[#1E1C1A] focus:outline-hidden focus:ring-2 focus:ring-[#D4A346]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                  Format de réponse
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm"
                >
                  <option value="boolean">Vrai ou Faux (Recommandé)</option>
                  <option value="options">Choix multiple (3 options)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                  Bonne réponse exacte <span className="text-rose-500">*</span>
                </label>
                {type === "boolean" ? (
                  <select
                    value={booleanAnswer ? "true" : "false"}
                    onChange={(e) => setBooleanAnswer(e.target.value === "true")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm font-bold text-[#8C6B24]"
                  >
                    <option value="false">FAUX (Ex: fausse croyance déconstruite)</option>
                    <option value="true">VRAI</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedOptionAnswer}
                    onChange={(e) => setSelectedOptionAnswer(e.target.value)}
                    placeholder="Ex: 72 heures"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm font-bold"
                  />
                )}
              </div>
            </div>

            {type === "options" && (
              <div>
                <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                  Options possibles (séparées par une virgule)
                </label>
                <input
                  type="text"
                  value={optionsStr}
                  onChange={(e) => setOptionsStr(e.target.value)}
                  placeholder="24 heures, 72 heures, 1 semaine"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                Référence de loi congolaise ou conventionnelle
              </label>
              <input
                type="text"
                value={lawRef}
                onChange={(e) => setLawRef(e.target.value)}
                placeholder="Ex: Loi n° 16/008, Code de la Famille art. 758, Loi n° 06/018..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4F483D] mb-1">
                Explication juridique & bienveillante <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Expliquez clairement ce que dit la loi pour éduquer et protéger la participante..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] text-sm resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#736B5E]">
                Durée de vie : <strong>Exactement 48 heures</strong>
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#D4A346] hover:bg-[#C29337] text-[#1E1C1A] font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <span>Publication...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publier pour 48 heures</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Currently Active Questions */}
          <div className="space-y-3 pt-2">
            <h4 className="font-serif font-bold text-base text-[#1E1C1A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8C6B24]" />
              <span>Questionnaires actuellement actifs sur le site ({activeQuestions.length})</span>
            </h4>

            <div className="space-y-2">
              {activeQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white p-4 rounded-xl border border-[#E2D9C8] flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-[#1E1C1A]">« {q.question} »</p>
                    <p className="text-[#595247]">
                      Bonne réponse : <strong>{String(q.correctAnswer)}</strong> • {q.lawRef}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold bg-[#FAF4E8] text-[#8C6B24] border border-[#E8DEC8] px-2.5 py-1 rounded-full text-[11px]">
                    ⏳ Reste {q.formattedCountdown || "48h"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
