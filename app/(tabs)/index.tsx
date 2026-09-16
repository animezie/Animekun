import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";

const heroImage = require("../../assets/images/demo-hero.jpg");
const panelImage = require("../../assets/images/demo-panel.jpg");
const characterSheet = require("../../assets/images/demo-character.jpg");

const STORAGE_KEY = "@webtoon_story_studio/project_v1";

type Section = "studio" | "bible" | "preview" | "settings";
type EpisodeStatus = "Published" | "Ready to review" | "Draft";

type Episode = {
  id: number;
  title: string;
  status: EpisodeStatus;
  duration: string;
  scenes: number;
  summary: string;
  arc: string;
};

type ProjectState = {
  episodeCount: number;
  latestTitle: string;
  storyDirection: string;
  episodes: Episode[];
};

const defaultEpisodes: Episode[] = [
  {
    id: 6,
    title: "Jam yang Berhenti di Menara",
    status: "Ready to review",
    duration: "01:42",
    scenes: 8,
    summary: "Nara menemukan peta langit yang hanya muncul ketika hujan turun.",
    arc: "Arc 01 · Kota yang Mengingat",
  },
  {
    id: 5,
    title: "Suara dari Lorong Air",
    status: "Published",
    duration: "02:05",
    scenes: 10,
    summary: "Sebuah pesan lama menghubungkan liontin amber dengan observatorium.",
    arc: "Arc 01 · Kota yang Mengingat",
  },
  {
    id: 4,
    title: "Tiga Ketukan Setelah Tengah Malam",
    status: "Published",
    duration: "01:56",
    scenes: 9,
    summary: "Pintu yang tak pernah ada terbuka di bawah stasiun tua.",
    arc: "Arc 01 · Kota yang Mengingat",
  },
  {
    id: 3,
    title: "Penjaga Tanpa Bayangan",
    status: "Published",
    duration: "01:48",
    scenes: 8,
    summary: "Nara menyadari seseorang mengikuti jejaknya dari masa lalu.",
    arc: "Arc 01 · Kota yang Mengingat",
  },
];

const defaultProject: ProjectState = {
  episodeCount: 6,
  latestTitle: "Jam yang Berhenti di Menara",
  storyDirection:
    "Nara harus memutuskan apakah akan mempercayai pesan dari observatorium sebelum hujan ketujuh turun.",
  episodes: defaultEpisodes,
};

const nextTitles = [
  "Peta yang Tidak Mengarah Pulang",
  "Hujan Ketujuh",
  "Nama di Balik Kabut",
  "Pintu Langit Utara",
  "Kota yang Menulis Ulang Dirinya",
];

function statusColor(status: EpisodeStatus) {
  if (status === "Published") return "#58D68D";
  if (status === "Ready to review") return "#F3B65B";
  return "#8FA4B7";
}

function SectionButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sectionButton, active && styles.sectionButtonActive, pressed && styles.pressed]}
    >
      <Text style={[styles.sectionIcon, active && styles.sectionIconActive]}>{icon}</Text>
      <Text style={[styles.sectionLabel, active && styles.sectionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "amber" | "green" }) {
  return (
    <View style={[styles.badge, tone === "amber" && styles.badgeAmber, tone === "green" && styles.badgeGreen]}>
      <Text style={[styles.badgeText, tone === "amber" && styles.badgeTextAmber, tone === "green" && styles.badgeTextGreen]}>
        {children}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [section, setSection] = useState<Section>("studio");
  const [project, setProject] = useState<ProjectState>(defaultProject);
  const [hydrated, setHydrated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(defaultProject.latestTitle);
  const [storyDirection, setStoryDirection] = useState(defaultProject.storyDirection);
  const [savedDirection, setSavedDirection] = useState(defaultProject.storyDirection);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [renderStatus, setRenderStatus] = useState("Preview ready");
  const [localMode, setLocalMode] = useState(true);
  const [reviewBeforeUpload, setReviewBeforeUpload] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          const stored = JSON.parse(value) as ProjectState;
          setProject(stored);
          setTitleDraft(stored.latestTitle);
          setStoryDirection(stored.storyDirection);
          setSavedDirection(stored.storyDirection);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || !autoSave) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(project)).catch(() => undefined);
  }, [project, hydrated, autoSave]);

  const latestEpisode = project.episodes[0];
  const continuityScore = Math.min(98, 88 + project.episodeCount);
  const previewSources = [heroImage, panelImage, characterSheet];
  const previewLabels = ["Panel pembuka", "Lokasi kunci", "Character lock"];
  const activePreviewSource = previewSources[previewIndex];

  const nextEpisodeLabel = useMemo(() => `EPISODE ${String(project.episodeCount + 1).padStart(2, "0")}`, [project.episodeCount]);

  const generateNextEpisode = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setRenderStatus("Local story engine sedang menyusun draft…");
    setTimeout(() => {
      const nextId = project.episodeCount + 1;
      const newEpisode: Episode = {
        id: nextId,
        title: nextTitles[(nextId - 7) % nextTitles.length],
        status: "Draft",
        duration: "01:30",
        scenes: 7,
        summary: `Arah cerita mengikuti keputusan Nara: ${savedDirection}`,
        arc: "Arc 01 · Kota yang Mengingat",
      };
      setProject((current) => ({
        episodeCount: nextId,
        latestTitle: newEpisode.title,
        storyDirection: savedDirection,
        episodes: [newEpisode, ...current.episodes],
      }));
      setTitleDraft(newEpisode.title);
      setIsGenerating(false);
      setRenderStatus("Draft baru siap diedit");
    }, 850);
  };

  const saveTitle = () => {
    const nextTitle = titleDraft.trim() || latestEpisode.title;
    setProject((current) => ({
      ...current,
      latestTitle: nextTitle,
      episodes: current.episodes.map((episode, index) => (index === 0 ? { ...episode, title: nextTitle } : episode)),
    }));
    setEditingTitle(false);
  };

  const saveDirection = () => {
    setSavedDirection(storyDirection.trim() || defaultProject.storyDirection);
    setProject((current) => ({ ...current, storyDirection: storyDirection.trim() || defaultProject.storyDirection }));
    setRenderStatus("Arah cerita tersimpan");
  };

  const queueRender = () => {
    setRenderStatus("Storyboard masuk antrean render");
    setTimeout(() => setRenderStatus("Preview ready"), 1600);
  };

  const shareProject = async () => {
    await Share.share({
      title: "Webtoon Story Studio",
      message: `${project.latestTitle}\n${project.storyDirection}\n\n${project.episodeCount} episode tersimpan di Story Bible lokal.`,
    });
  };

  const resetDemo = () => {
    Alert.alert("Reset proyek demo?", "Episode dan arah cerita akan kembali ke contoh awal.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setProject(defaultProject);
          setTitleDraft(defaultProject.latestTitle);
          setStoryDirection(defaultProject.storyDirection);
          setSavedDirection(defaultProject.storyDirection);
          setRenderStatus("Preview ready");
        },
      },
    ]);
  };

  const renderEpisode = ({ item }: { item: Episode }) => (
    <View style={styles.episodeCard}>
      <View style={styles.episodeNumber}><Text style={styles.episodeNumberText}>{String(item.id).padStart(2, "0")}</Text></View>
      <View style={styles.episodeBody}>
        <View style={styles.rowBetween}>
          <Text style={styles.episodeTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.statusLine}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.episodeMeta}>{item.arc}  ·  {item.scenes} scenes  ·  {item.duration}</Text>
        <Text style={styles.episodeSummary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.episodeActions}>
          <Pressable onPress={() => { setTitleDraft(item.title); setEditingTitle(true); setSection("studio"); }} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
            <Text style={styles.smallButtonText}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => { setPreviewIndex(0); setSection("preview"); }} style={({ pressed }) => [styles.smallButtonGhost, pressed && styles.pressed]}>
            <Text style={styles.smallButtonGhostText}>Preview</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#111A1F]" safeAreaClassName="bg-[#111A1F]">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>STORY / LAB</Text>
            <Text style={styles.appTitle}>Webtoon Story Studio</Text>
          </View>
          <View style={styles.localBadge}><View style={styles.liveDot} /><Text style={styles.localBadgeText}>{localMode ? "LOCAL-FIRST" : "HYBRID"}</Text></View>
        </View>

        <View style={styles.sectionNav}>
          <SectionButton label="Studio" icon="✦" active={section === "studio"} onPress={() => setSection("studio")} />
          <SectionButton label="Story Bible" icon="◈" active={section === "bible"} onPress={() => setSection("bible")} />
          <SectionButton label="Preview" icon="▷" active={section === "preview"} onPress={() => setSection("preview")} />
          <SectionButton label="Settings" icon="⚙" active={section === "settings"} onPress={() => setSection("settings")} />
        </View>

        {section === "studio" && (
          <>
            <View style={styles.heroCard}>
              <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.heroShade} />
              <View style={styles.heroContent}>
                <Badge tone="amber">ARC 01 · MYSTERY FANTASY</Badge>
                <Text style={styles.heroTitle}>Kota yang{`\n`}Mengingat</Text>
                <Text style={styles.heroDescription}>Cerita bersambung tentang Nara, seorang penyelidik yang menemukan kota yang dapat mengingat masa depan.</Text>
                <View style={styles.heroBottom}><Text style={styles.heroEpisode}>EP {String(project.episodeCount).padStart(2, "0")} · {latestEpisode.title}</Text><Text style={styles.heroArrow}>↗</Text></View>
              </View>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statCard}><Text style={styles.statValue}>{project.episodeCount}</Text><Text style={styles.statLabel}>episode tersimpan</Text></View>
              <View style={styles.statCard}><Text style={styles.statValue}>03</Text><Text style={styles.statLabel}>character locks</Text></View>
              <View style={styles.statCard}><Text style={[styles.statValue, styles.statAccent]}>{continuityScore}%</Text><Text style={styles.statLabel}>continuity check</Text></View>
            </View>

            <View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>CONTINUE THE THREAD</Text><Text style={styles.sectionTitle}>Lanjutkan cerita</Text></View><Badge tone="green">{isGenerating ? "WRITING" : "READY"}</Badge></View>
            <View style={styles.continueCard}>
              <View style={styles.continueTop}><View><Text style={styles.continueLabel}>{nextEpisodeLabel}</Text><Text style={styles.continueTitle}>{nextTitles[(project.episodeCount - 6) % nextTitles.length]}</Text></View><View style={styles.magicIcon}><Text style={styles.magicIconText}>✦</Text></View></View>
              <Text style={styles.continueDescription}>Generator akan memakai Story Bible, ringkasan episode terakhir, dan arah cerita Anda agar karakter serta dunia tetap konsisten.</Text>
              <View style={styles.directionBox}><Text style={styles.directionLabel}>ARAH CERITA AKTIF</Text><Text style={styles.directionText} numberOfLines={2}>{savedDirection}</Text></View>
              <Pressable onPress={generateNextEpisode} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>{isGenerating ? "Menyusun draft lokal…" : "Generate episode berikutnya"}</Text><Text style={styles.primaryButtonArrow}>→</Text>
              </Pressable>
            </View>

            {editingTitle && (
              <View style={styles.editorCard}>
                <View style={styles.rowBetween}><Text style={styles.editorTitle}>Quick editor · episode terbaru</Text><Pressable onPress={() => setEditingTitle(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
                <Text style={styles.inputLabel}>JUDUL EPISODE</Text>
                <TextInput value={titleDraft} onChangeText={setTitleDraft} style={styles.textInput} placeholder="Judul episode" placeholderTextColor="#6E8090" />
                <Text style={styles.inputLabel}>ARAH CERITA SELANJUTNYA</Text>
                <TextInput value={storyDirection} onChangeText={setStoryDirection} style={[styles.textInput, styles.multilineInput]} multiline placeholder="Apa yang harus terjadi berikutnya?" placeholderTextColor="#6E8090" />
                <View style={styles.editorActions}><Pressable onPress={saveTitle} style={({ pressed }) => [styles.primaryButtonCompact, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Simpan perubahan</Text></Pressable><Pressable onPress={saveDirection} style={({ pressed }) => [styles.smallButtonGhost, pressed && styles.pressed]}><Text style={styles.smallButtonGhostText}>Simpan arah</Text></Pressable></View>
              </View>
            )}

            <View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>EPISODE ARCHIVE</Text><Text style={styles.sectionTitle}>Riwayat produksi</Text></View><Text style={styles.archiveCount}>{project.episodes.length} terbaru</Text></View>
            <FlatList data={project.episodes} keyExtractor={(item) => String(item.id)} renderItem={renderEpisode} scrollEnabled={false} />
          </>
        )}

        {section === "bible" && (
          <>
            <View style={styles.pageIntro}><Text style={styles.sectionKicker}>CANON CONTROL CENTER</Text><Text style={styles.pageTitle}>Story Bible</Text><Text style={styles.pageDescription}>Satu sumber kebenaran untuk menjaga wajah, kostum, motif, dan aturan dunia tetap konsisten di setiap episode.</Text></View>
            <View style={styles.characterCard}>
              <Image source={characterSheet} style={styles.characterImage} resizeMode="cover" />
              <View style={styles.characterInfo}><Badge tone="green">LOCKED ASSET</Badge><Text style={styles.characterName}>Nara Wijaya</Text><Text style={styles.characterRole}>Protagonist · urban myth investigator</Text><Text style={styles.characterDescription}>Rambut bob hitam, jaket teal, liontin amber, ekspresi tegas. Tidak boleh berubah kecuali ada event cerita yang mengubahnya.</Text><View style={styles.lockRow}><Text style={styles.lockIcon}>⌁</Text><Text style={styles.lockText}>Visual identity locked</Text></View></View>
            </View>
            <Text style={styles.blockTitle}>Continuity locks</Text>
            {["Karakter & wardrobe", "Lokasi observatorium", "Palet teal + amber", "Timeline episode"].map((label) => <View key={label} style={styles.lockCard}><View style={styles.lockCheck}><Text style={styles.lockCheckText}>✓</Text></View><Text style={styles.lockCardText}>{label}</Text><Text style={styles.lockCardStatus}>SYNCED</Text></View>)}
            <Text style={styles.blockTitle}>Arah cerita aktif</Text>
            <View style={styles.directionEditor}><TextInput value={storyDirection} onChangeText={setStoryDirection} style={[styles.textInput, styles.multilineInput]} multiline placeholderTextColor="#6E8090" /><Pressable onPress={saveDirection} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Simpan ke Story Bible</Text><Text style={styles.primaryButtonArrow}>✓</Text></Pressable></View>
            <View style={styles.assetCard}><Image source={panelImage} style={styles.assetImage} resizeMode="cover" /><View style={styles.assetOverlay}><Text style={styles.assetLabel}>WORLD ASSET</Text><Text style={styles.assetTitle}>Observatorium Utara</Text><Text style={styles.assetMeta}>Reference · 16:9 · teal night</Text></View></View>
          </>
        )}

        {section === "preview" && (
          <>
            <View style={styles.pageIntro}><Text style={styles.sectionKicker}>STORYBOARD PLAYER</Text><Text style={styles.pageTitle}>Webtoon preview</Text><Text style={styles.pageDescription}>Rasakan urutan panel sebelum dirender menjadi video slideshow. Setiap panel memakai asset lock dari Story Bible.</Text></View>
            <View style={styles.previewCard}><Image source={activePreviewSource} style={styles.previewImage} resizeMode="cover" /><View style={styles.previewOverlay}><Badge tone="amber">{previewLabels[previewIndex]}</Badge><Text style={styles.previewCaption}>{previewIndex === 0 ? "Hujan turun. Kota membuka ingatannya." : previewIndex === 1 ? "Observatorium menyimpan jawaban yang belum siap didengar." : "Nara — visual identity locked untuk episode selanjutnya."}</Text></View></View>
            <View style={styles.previewControls}><Pressable onPress={() => setPreviewIndex((previewIndex + previewSources.length - 1) % previewSources.length)} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}><Text style={styles.controlText}>‹</Text></Pressable><Text style={styles.previewCounter}>{previewIndex + 1} / {previewSources.length}</Text><Pressable onPress={() => setPreviewIndex((previewIndex + 1) % previewSources.length)} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}><Text style={styles.controlText}>›</Text></Pressable></View>
            <View style={styles.renderCard}><View><Text style={styles.sectionKicker}>RENDER QUEUE</Text><Text style={styles.renderTitle}>{renderStatus}</Text><Text style={styles.renderDescription}>Output target: vertical 9:16 · motion comic · subtitle safe area</Text></View><Pressable onPress={queueRender} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}><Text style={styles.outlineButtonText}>Queue render</Text></Pressable></View>
            <View style={styles.noteCard}><Text style={styles.noteIcon}>i</Text><Text style={styles.noteText}>MVP ini memvalidasi storyboard dan kesinambungan. Ekspor MP4 native akan diaktifkan setelah encoder Android ditambahkan, agar rendering stabil di Galaxy A72.</Text></View>
          </>
        )}

        {section === "settings" && (
          <>
            <View style={styles.pageIntro}><Text style={styles.sectionKicker}>PROJECT SETTINGS</Text><Text style={styles.pageTitle}>Production setup</Text><Text style={styles.pageDescription}>Kontrol privasi, penyimpanan, dan aturan publikasi untuk proyek ini.</Text></View>
            <View style={styles.settingsCard}><View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Local-first story engine</Text><Text style={styles.settingDescription}>Draft cerita dibuat lokal dan tidak mengirim naskah ke server.</Text></View><Switch value={localMode} onValueChange={setLocalMode} trackColor={{ false: "#30404D", true: "#2E7F88" }} thumbColor={localMode ? "#E7C77E" : "#9AA6AE"} /></View><View style={styles.divider} /><View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Auto-save project</Text><Text style={styles.settingDescription}>Simpan Story Bible dan episode ke penyimpanan aplikasi.</Text></View><Switch value={autoSave} onValueChange={setAutoSave} trackColor={{ false: "#30404D", true: "#2E7F88" }} thumbColor={autoSave ? "#E7C77E" : "#9AA6AE"} /></View><View style={styles.divider} /><View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Review sebelum upload</Text><Text style={styles.settingDescription}>Tidak ada publikasi otomatis tanpa persetujuan Anda.</Text></View><Switch value={reviewBeforeUpload} onValueChange={setReviewBeforeUpload} trackColor={{ false: "#30404D", true: "#2E7F88" }} thumbColor={reviewBeforeUpload ? "#E7C77E" : "#9AA6AE"} /></View></View>
            <Text style={styles.blockTitle}>Target platform</Text><View style={styles.platformGrid}><View style={styles.platformPill}><Text style={styles.platformIcon}>▶</Text><Text style={styles.platformText}>YouTube</Text><Text style={styles.platformState}>EXPORT</Text></View><View style={styles.platformPill}><Text style={styles.platformIcon}>♪</Text><Text style={styles.platformText}>TikTok</Text><Text style={styles.platformState}>EXPORT</Text></View><View style={styles.platformPill}><Text style={styles.platformIcon}>◎</Text><Text style={styles.platformText}>Instagram</Text><Text style={styles.platformState}>EXPORT</Text></View></View>
            <View style={styles.safetyCard}><Text style={styles.safetyTitle}>Keamanan & kesiapan</Text><Text style={styles.safetyText}>Aplikasi tidak meminta akses mobile banking, OTP, IMEI, kontak, atau kredensial platform. Integrasi upload resmi akan memakai OAuth dan tetap dapat ditinjau sebelum publikasi.</Text></View>
            <Pressable onPress={shareProject} style={({ pressed }) => [styles.outlineButtonWide, pressed && styles.pressed]}><Text style={styles.outlineButtonText}>Bagikan ringkasan proyek</Text><Text style={styles.primaryButtonArrow}>↗</Text></Pressable>
            <Pressable onPress={resetDemo} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}><Text style={styles.resetButtonText}>Reset demo project</Text></Pressable>
          </>
        )}

        <View style={styles.footer}><Text style={styles.footerTitle}>WEBTOON STORY STUDIO</Text><Text style={styles.footerText}>Local-first · editable · continuity-aware</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 36 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  eyebrow: { color: "#E7C77E", fontSize: 10, fontWeight: "800", letterSpacing: 2.8 },
  appTitle: { color: "#F1F5F7", fontSize: 19, fontWeight: "700", marginTop: 5, letterSpacing: -0.3 },
  localBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#182C31", borderColor: "#2F5860", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#58D68D", marginRight: 7 },
  localBadgeText: { color: "#9ED5C1", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionNav: { flexDirection: "row", backgroundColor: "#182126", borderRadius: 16, padding: 5, marginBottom: 22, borderWidth: 1, borderColor: "#27353D" },
  sectionButton: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12 },
  sectionButtonActive: { backgroundColor: "#2C535A" },
  sectionIcon: { color: "#71808B", fontSize: 16, marginBottom: 3 },
  sectionIconActive: { color: "#E7C77E" },
  sectionLabel: { color: "#71808B", fontSize: 9, fontWeight: "700" },
  sectionLabelActive: { color: "#F1F5F7" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  heroCard: { height: 340, borderRadius: 24, overflow: "hidden", backgroundColor: "#1C2A30", marginBottom: 14 },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8, 18, 23, 0.48)" },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: 22 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6, backgroundColor: "#273842", borderWidth: 1, borderColor: "#425560" },
  badgeAmber: { backgroundColor: "#4A3A25", borderColor: "#A77C3D" },
  badgeGreen: { backgroundColor: "#1E3A35", borderColor: "#3D7767" },
  badgeText: { color: "#B6C5CB", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  badgeTextAmber: { color: "#F2C97B" },
  badgeTextGreen: { color: "#8DE0BD" },
  heroTitle: { color: "#FFFFFF", fontSize: 38, lineHeight: 39, fontWeight: "800", letterSpacing: -1.2, marginTop: 12 },
  heroDescription: { color: "#D2E0E4", fontSize: 12, lineHeight: 18, maxWidth: 300, marginTop: 10 },
  heroBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  heroEpisode: { color: "#E7C77E", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, flex: 1 },
  heroArrow: { color: "#FFFFFF", fontSize: 25 },
  statGrid: { flexDirection: "row", gap: 8, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: "#192329", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#27363D" },
  statValue: { color: "#F1F5F7", fontSize: 24, fontWeight: "800" },
  statAccent: { color: "#E7C77E" },
  statLabel: { color: "#82939D", fontSize: 9, lineHeight: 13, marginTop: 5 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  sectionKicker: { color: "#E7C77E", fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  sectionTitle: { color: "#F1F5F7", fontSize: 23, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  continueCard: { backgroundColor: "#192329", borderRadius: 21, padding: 17, borderWidth: 1, borderColor: "#2B4347", marginBottom: 26 },
  continueTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  continueLabel: { color: "#E7C77E", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  continueTitle: { color: "#F1F5F7", fontSize: 19, fontWeight: "700", marginTop: 7, maxWidth: 260 },
  magicIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#304D52", alignItems: "center", justifyContent: "center" },
  magicIconText: { color: "#E7C77E", fontSize: 22 },
  continueDescription: { color: "#92A2AA", fontSize: 12, lineHeight: 18, marginTop: 14 },
  directionBox: { backgroundColor: "#111A1F", borderRadius: 12, padding: 12, marginTop: 14, borderLeftWidth: 2, borderLeftColor: "#E7C77E" },
  directionLabel: { color: "#758792", fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  directionText: { color: "#D6E0E3", fontSize: 12, lineHeight: 17, marginTop: 5 },
  primaryButton: { marginTop: 15, backgroundColor: "#E7C77E", minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", paddingHorizontal: 15 },
  primaryButtonCompact: { backgroundColor: "#E7C77E", minHeight: 43, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  primaryButtonText: { color: "#172226", fontSize: 12, fontWeight: "800", flex: 1 },
  primaryButtonArrow: { color: "#172226", fontSize: 21, fontWeight: "600" },
  editorCard: { backgroundColor: "#202D33", borderRadius: 18, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#375158" },
  editorTitle: { color: "#F1F5F7", fontSize: 14, fontWeight: "800" },
  closeText: { color: "#8EA1AA", fontSize: 27, lineHeight: 24 },
  inputLabel: { color: "#82939D", fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginTop: 16, marginBottom: 7 },
  textInput: { backgroundColor: "#121B20", borderWidth: 1, borderColor: "#33464E", borderRadius: 10, color: "#EDF3F4", minHeight: 44, paddingHorizontal: 12, fontSize: 13 },
  multilineInput: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  editorActions: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 16 },
  smallButton: { backgroundColor: "#2D6669", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  smallButtonText: { color: "#E4F2F1", fontSize: 10, fontWeight: "800" },
  smallButtonGhost: { borderWidth: 1, borderColor: "#4A6068", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  smallButtonGhostText: { color: "#B5C4CA", fontSize: 10, fontWeight: "800" },
  archiveCount: { color: "#71818B", fontSize: 11 },
  episodeCard: { flexDirection: "row", backgroundColor: "#192329", borderWidth: 1, borderColor: "#27363D", borderRadius: 16, padding: 12, marginBottom: 9 },
  episodeNumber: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#304A50", alignItems: "center", justifyContent: "center", marginRight: 11 },
  episodeNumberText: { color: "#E7C77E", fontSize: 13, fontWeight: "800" },
  episodeBody: { flex: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  episodeTitle: { color: "#EEF4F5", fontSize: 13, fontWeight: "700", flex: 1 },
  statusLine: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 8, fontWeight: "800" },
  episodeMeta: { color: "#71828D", fontSize: 9, marginTop: 5 },
  episodeSummary: { color: "#A8B6BB", fontSize: 11, lineHeight: 16, marginTop: 8 },
  episodeActions: { flexDirection: "row", gap: 7, marginTop: 10 },
  pageIntro: { marginBottom: 20 },
  pageTitle: { color: "#F1F5F7", fontSize: 32, fontWeight: "800", marginTop: 6, letterSpacing: -0.8 },
  pageDescription: { color: "#94A5AD", fontSize: 13, lineHeight: 19, marginTop: 8 },
  characterCard: { flexDirection: "row", backgroundColor: "#192329", borderRadius: 20, padding: 12, borderWidth: 1, borderColor: "#2B4347", marginBottom: 23 },
  characterImage: { width: 124, height: 178, borderRadius: 14, backgroundColor: "#263138" },
  characterInfo: { flex: 1, paddingLeft: 13, paddingTop: 2 },
  characterName: { color: "#F1F5F7", fontSize: 20, fontWeight: "800", marginTop: 10 },
  characterRole: { color: "#E7C77E", fontSize: 10, marginTop: 3 },
  characterDescription: { color: "#9AABB3", fontSize: 11, lineHeight: 16, marginTop: 10 },
  lockRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  lockIcon: { color: "#58D68D", fontSize: 18, marginRight: 5 },
  lockText: { color: "#8FD2BC", fontSize: 10, fontWeight: "700" },
  blockTitle: { color: "#F1F5F7", fontSize: 16, fontWeight: "800", marginBottom: 10 },
  lockCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#192329", borderWidth: 1, borderColor: "#27363D", borderRadius: 13, padding: 12, marginBottom: 8 },
  lockCheck: { width: 23, height: 23, borderRadius: 12, backgroundColor: "#224C43", alignItems: "center", justifyContent: "center", marginRight: 10 },
  lockCheckText: { color: "#84E2BA", fontWeight: "900" },
  lockCardText: { color: "#D2DEE1", fontSize: 12, fontWeight: "600", flex: 1 },
  lockCardStatus: { color: "#6FC6A6", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  directionEditor: { backgroundColor: "#192329", borderRadius: 16, padding: 12, marginBottom: 22, borderWidth: 1, borderColor: "#27363D" },
  assetCard: { height: 186, borderRadius: 18, overflow: "hidden", marginBottom: 10 },
  assetImage: { width: "100%", height: "100%" },
  assetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", padding: 15, backgroundColor: "rgba(6, 17, 22, 0.33)" },
  assetLabel: { color: "#E7C77E", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  assetTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", marginTop: 4 },
  assetMeta: { color: "#C7D4D8", fontSize: 10, marginTop: 3 },
  previewCard: { height: 390, backgroundColor: "#10181D", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#2D454B" },
  previewImage: { width: "100%", height: "100%" },
  previewOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", padding: 18, backgroundColor: "rgba(7, 17, 21, 0.26)" },
  previewCaption: { color: "#FFFFFF", fontSize: 19, lineHeight: 24, fontWeight: "800", marginTop: 11, maxWidth: 290 },
  previewControls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, paddingVertical: 12 },
  controlButton: { width: 40, height: 34, borderRadius: 10, backgroundColor: "#273B42", alignItems: "center", justifyContent: "center" },
  controlText: { color: "#E7C77E", fontSize: 24, lineHeight: 27 },
  previewCounter: { color: "#B3C2C8", fontSize: 11, fontWeight: "800" },
  renderCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#192329", borderRadius: 17, padding: 15, borderWidth: 1, borderColor: "#27363D", marginBottom: 13 },
  renderTitle: { color: "#F1F5F7", fontSize: 14, fontWeight: "800", marginTop: 5 },
  renderDescription: { color: "#81929B", fontSize: 10, marginTop: 5, maxWidth: 205, lineHeight: 14 },
  outlineButton: { borderWidth: 1, borderColor: "#B99756", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10 },
  outlineButtonText: { color: "#E7C77E", fontSize: 10, fontWeight: "800" },
  noteCard: { flexDirection: "row", backgroundColor: "#222F34", borderRadius: 13, padding: 12, marginBottom: 10 },
  noteIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#426069", color: "#D8EDF0", textAlign: "center", lineHeight: 20, fontWeight: "800", marginRight: 9 },
  noteText: { color: "#A9BABF", fontSize: 10, lineHeight: 15, flex: 1 },
  settingsCard: { backgroundColor: "#192329", borderRadius: 17, paddingHorizontal: 15, borderWidth: 1, borderColor: "#27363D", marginBottom: 22 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 15 },
  settingCopy: { flex: 1, paddingRight: 12 },
  settingTitle: { color: "#EAF1F2", fontSize: 13, fontWeight: "700" },
  settingDescription: { color: "#81929B", fontSize: 10, lineHeight: 14, marginTop: 4 },
  divider: { height: 1, backgroundColor: "#293940" },
  platformGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  platformPill: { flex: 1, backgroundColor: "#192329", borderRadius: 13, padding: 11, borderWidth: 1, borderColor: "#27363D" },
  platformIcon: { color: "#E7C77E", fontSize: 16 },
  platformText: { color: "#DDE7E9", fontSize: 11, fontWeight: "700", marginTop: 8 },
  platformState: { color: "#71848D", fontSize: 8, fontWeight: "800", marginTop: 4, letterSpacing: 0.8 },
  safetyCard: { backgroundColor: "#1D3332", borderColor: "#36645C", borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 13 },
  safetyTitle: { color: "#99E0C3", fontSize: 13, fontWeight: "800" },
  safetyText: { color: "#A8C6BF", fontSize: 11, lineHeight: 17, marginTop: 6 },
  outlineButtonWide: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#B99756", borderRadius: 11, minHeight: 46 },
  resetButton: { alignItems: "center", padding: 18 },
  resetButtonText: { color: "#9B6C6C", fontSize: 11, fontWeight: "700" },
  footer: { borderTopWidth: 1, borderTopColor: "#27363D", marginTop: 28, paddingTop: 18 },
  footerTitle: { color: "#5E717B", fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  footerText: { color: "#50616B", fontSize: 10, marginTop: 5 },
});
