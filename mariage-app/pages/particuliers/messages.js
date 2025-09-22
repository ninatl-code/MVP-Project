import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Header from "../../components/HeaderParti";
import { Eye, EyeOff, Trash2 } from "lucide-react";

// Fonction utilitaire pour récupérer une photo correcte
const getPhotoUrl = (photo) => {
  if (!photo) return "https://via.placeholder.com/40";
  if (typeof photo === "string" && photo.startsWith("data:")) return photo;
  if (Array.isArray(photo) && photo.length > 0) {
    const first = photo[0];
    if (typeof first === "string" && first.startsWith("data:")) return first;
  }
  return "https://via.placeholder.com/40";
};

export default function MessagesParticulier() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [checkedConvs, setCheckedConvs] = useState([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [objetInput, setObjetInput] = useState("");
  const [annonceTitles, setAnnonceTitles] = useState({});

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      const { data: authData } = await supabase.auth.getUser();
      setUser(authData?.user);
      if (!authData?.user) return;

      // Récupère toutes les conversations de l'utilisateur (non supprimées)
      const { data: conversationsData, error: convError } = await supabase
        .from("conversations")
        .select(
          "id, artist_id, client_id, annonce_id, last_message, created_at, updated, deletion_dateParti, lu"
        )
        .eq("client_id", authData.user.id)
        .is("deletion_dateParti", null)
        .order("updated", { ascending: false });
      if (convError || !conversationsData) return;

      // Récupère tous les messages liés
      const convIds = conversationsData.map((c) => c.id);
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, receiver_id, objet, contenu, created_at, deletion_dateParti"
        )
        .in("conversation_id", convIds)
        .is("deletion_dateParti", null)
        .order("created_at", { ascending: true });
      if (msgError || !messages) return;

      // Récupère tous les profils nécessaires
      const userIds = Array.from(
        new Set(messages.flatMap((m) => [m.sender_id, m.receiver_id]))
      );
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, nom, role, photos")
        .in("id", userIds);
      if (profileError || !profiles) return;

      const profileMap = {};
      profiles.forEach((p) => {
        profileMap[p.id] = p;
      });

      // Récupère les titres d'annonces
      const annonceIds = Array.from(
        new Set(conversationsData.map((c) => c.annonce_id).filter(Boolean))
      );
      let annonceTitlesMap = {};
      if (annonceIds.length > 0) {
        const { data: annoncesData } = await supabase
          .from("annonces")
          .select("id, titre")
          .in("id", annonceIds);
        if (annoncesData) {
          annoncesData.forEach((a) => {
            annonceTitlesMap[a.id] = a.titre;
          });
        }
      }
      setAnnonceTitles(annonceTitlesMap);

      // Regroupe les messages par conversation
      const convMap = {};
      conversationsData.forEach((conv) => {
        convMap[conv.id] = {
          conversation: conv,
          user:
            profileMap[
              conv.artist_id === authData.user.id
                ? conv.client_id
                : conv.artist_id
            ],
          userId:
            conv.artist_id === authData.user.id
              ? conv.client_id
              : conv.artist_id,
          annonceId: conv.annonce_id,
          messages: [],
          prestatairePhoto: profileMap[conv.artist_id]?.photos || null,
        };
      });

      messages.forEach((msg) => {
        if (convMap[msg.conversation_id]) {
          convMap[msg.conversation_id].messages.push(msg);
        }
      });

      const convArr = Object.values(convMap).sort((a, b) => {
        const aDate = a.messages[a.messages.length - 1]?.created_at || "";
        const bDate = b.messages[b.messages.length - 1]?.created_at || "";
        return new Date(bDate) - new Date(aDate);
      });

      setConversations(convArr);
      if (convArr.length > 0 && !selectedConv) setSelectedConv(convArr[0]);

      // Marquer comme lus messages du premier conv
      if (convArr.length > 0) {
        const conv = convArr[0];
        await supabase
          .from("messages")
          .update({ lu: true })
          .eq("conversation_id", conv.conversation.id)
          .eq("receiver_id", authData.user.id);
        await supabase
          .from("conversations")
          .update({ lu: true })
          .eq("id", conv.conversation.id);
      }
    };
    fetchUserAndConversations();
  }, []);

  // Marquer lu / non lu
  const handleMarkReadUnread = async (markAsRead) => {
    for (const convId of checkedConvs) {
      await supabase
        .from("conversations")
        .update({ lu: markAsRead })
        .eq("id", convId);
    }
    setCheckedConvs([]);
    setConversations(
      conversations.map((conv) =>
        checkedConvs.includes(conv.conversation.id)
          ? { ...conv, conversation: { ...conv.conversation, lu: markAsRead } }
          : conv
      )
    );
  };

  // Sélection d'une conv
  const handleSelectConv = async (conv) => {
    setSelectedConv(conv);
    await supabase
      .from("messages")
      .update({ lu: true })
      .eq("conversation_id", conv.conversation.id)
      .eq("receiver_id", user?.id);
    await supabase
      .from("conversations")
      .update({ lu: true })
      .eq("id", conv.conversation.id);
    setConversations(
      conversations.map((c) =>
        c.conversation.id === conv.conversation.id
          ? { ...c, conversation: { ...c.conversation, lu: true } }
          : c
      )
    );
  };

  // Envoi message
  const handleSend = async () => {
    if (!messageInput || !selectedConv || !user?.id) return;
    let objetToUse = "";
    if (selectedConv.messages.length > 0) {
      objetToUse = selectedConv.messages[0].objet || "";
    } else {
      objetToUse = objetInput;
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: selectedConv.conversation.id,
        sender_id: user.id,
        receiver_id: selectedConv.userId,
        contenu: messageInput,
        objet: objetToUse,
        lu: false,
      },
    ]);
    await supabase.from("notifications").insert([
      {
        user_id: selectedConv.userId,
        type: "message",
        contenu: messageInput,
        lu: false,
      },
    ]);
    if (!error) {
      await supabase
        .from("conversations")
        .update({ last_message: messageInput, updated: now })
        .eq("id", selectedConv.conversation.id);
      await supabase
        .from("messages")
        .update({ deletion_dateParti: null })
        .eq("conversation_id", selectedConv.conversation.id);
      setMessageInput("");
      setObjetInput("");
      await new Promise((res) => setTimeout(res, 300));
      window.location.reload();
    }
  };

  const filteredConvs = conversations.filter(
    (conv) =>
      ((conv.user?.nom || "").toLowerCase().includes(search.toLowerCase()) ||
        (conv.user?.metier || "").toLowerCase().includes(search.toLowerCase())) &&
      conv.conversation.deletion_dateParti == null
  );

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-4">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Liste des convs */}
          <div className="md:col-span-1 bg-slate-50 border-r border-slate-200 py-6">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 px-4">
              Messages
            </h2>
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full mb-4 px-3 py-2 rounded-xl border border-slate-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <ul>
              {filteredConvs.length === 0 ? (
                <div className="text-slate-400 text-center py-12">
                  Aucun message
                </div>
              ) : (
                filteredConvs.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const objet = lastMsg?.objet || "";
                  const lastPreview = lastMsg?.contenu
                    ? lastMsg.contenu.slice(0, 40) +
                      (lastMsg.contenu.length > 40 ? "..." : "")
                    : "";
                  const isRead = conv.conversation.lu;
                  const annonceTitre = conv.annonceId
                    ? annonceTitles[conv.annonceId]
                    : "";

                  const photoUrl = getPhotoUrl(conv.prestatairePhoto);

                  return (
                    <li
                      key={conv.userId}
                      className={`flex flex-col gap-1 p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-100 ${
                        selectedConv?.userId === conv.userId
                          ? "bg-white"
                          : !isRead
                          ? "bg-blue-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={photoUrl}
                          alt={conv.user?.nom}
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => handleSelectConv(conv)}
                        >
                          <div className="font-semibold text-slate-700 truncate">
                            {conv.user?.nom || "Utilisateur"}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {conv.user?.role || ""}
                          </div>
                          {annonceTitre && (
                            <div className="text-xs text-blue-700 truncate">
                              {annonceTitre}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 truncate">
                            {lastPreview}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 min-w-[60px] text-right">
                          {lastMsg
                            ? new Date(lastMsg.created_at).toLocaleDateString(
                                "fr-FR",
                                { day: "numeric", month: "short" }
                              )
                            : ""}
                        </div>
                      </div>
                      {objet && (
                        <div className="text-xs text-slate-500 ml-14">
                          {objet}
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Messages de la conv sélectionnée */}
          <div className="md:col-span-2 py-6">
            {selectedConv ? (
              <div className="flex flex-col h-[60vh] bg-white rounded-xl shadow p-6">
                {/* En-tête */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getPhotoUrl(selectedConv.prestatairePhoto)}
                      alt={selectedConv.user?.nom || "Utilisateur"}
                      className="w-12 h-12 rounded-full object-cover border"
                    />
                    <div>
                      <div className="font-bold text-lg text-slate-800">
                        {selectedConv.user?.nom || "Utilisateur"}
                      </div>
                      <div className="text-sm text-slate-400">
                        {selectedConv.user?.role || ""}
                      </div>
                      {selectedConv.messages.length > 0 &&
                        selectedConv.messages[0].objet && (
                          <div className="text-xs text-slate-500 mt-1">
                            {selectedConv.messages[0].objet}
                          </div>
                        )}
                      {selectedConv.annonceId &&
                        annonceTitles[selectedConv.annonceId] && (
                          <div className="text-xs text-blue-700 mt-1">
                            {annonceTitles[selectedConv.annonceId]}
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {selectedConv.messages.length > 0
                      ? new Date(
                          selectedConv.messages[
                            selectedConv.messages.length - 1
                          ].created_at
                        ).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4">
                  {selectedConv.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-3 flex ${
                        msg.sender_id === user?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-xl whitespace-pre-line relative ${
                          msg.sender_id === user?.id
                            ? "bg-slate-700 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="text-sm">{msg.contenu}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulaire */}
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                >
                  <input
                    type="text"
                    className="w-1/3 px-3 py-2 rounded-xl border border-slate-300"
                    placeholder="Objet du message"
                    value={objetInput}
                    onChange={(e) => setObjetInput(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300"
                    placeholder="Votre message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-slate-700 text-white px-6 py-2 rounded-xl"
                  >
                    Envoyer
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-slate-400 text-center py-12">
                Sélectionnez une conversation pour afficher les messages.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
