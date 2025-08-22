import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Dimensions } from "react-native";
import { SvgUri } from "react-native-svg";

const brandColors = [
  "#232625","#393031","#545456","#282827","#563F2F","#46372D","#635749",
  "#AB9E87","#F8C1E1","#ED1C25","#F1EFE5","#F0E4CB","#731702","#CBBC9F",
];

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

type StyleKey = "adventurer" | "micah" | "bottts" | "identicon";

export default function AvatarPicker({
  initialSeed,
  initialStyle = "adventurer",
  onConfirm,
}: {
  initialSeed?: string;
  initialStyle?: StyleKey;
  onConfirm: (payload: { seed: string; style: StyleKey; uri: string }) => void;
}) {
  const [style, setStyle] = useState<StyleKey>(initialStyle as StyleKey);
  const [seedInput, setSeedInput] = useState((initialSeed || "").trim());
  const [selectedSeed, setSelectedSeed] = useState(seedInput || "");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // example seed pool shown in grid — you can expand this or generate randomly
  const sampleSeeds = useMemo(
    () => [
      "Explorer", "Astra", "Nova", "Tsebo", "ShieldUser", "Traveler", "Luna",
      "Harper", "Kai", "Mika", "Riley", "Sam", "Jordan", "Aiden",
    ],
    []
  );

  const buildUri = (s: string) => {
    const safe = encodeURIComponent((s || "anonymous").trim().replace(/\s+/g, "_"));
    return `${DICEBEAR_BASE}/${style}/svg?seed=${safe}`;
  };

  const confirm = () => {
    const seed = (selectedSeed || seedInput || "anonymous").trim().replace(/\s+/g, "_");
    const uri = buildUri(seed);
    onConfirm({ seed, style, uri });
  };

  const numColumns = 4;
  const previewSize = Math.floor((Dimensions.get("window").width - 60) / numColumns);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Choose your avatar</Text>

      {/* style selector */}
      <View style={styles.styleRow}>
        {(["adventurer","micah","bottts","identicon"] as StyleKey[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStyle(s)}
            style={[styles.styleBtn, style === s && styles.styleBtnActive]}
          >
            <Text style={[styles.styleText, style === s && styles.styleTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* seed input */}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Type a name (or pick below)"
          value={seedInput}
          onChangeText={(t) => {
            setSeedInput(t);
            setSelectedSeed(t);
            setHighlighted(null);
          }}
          style={styles.input}
          autoCapitalize="words"
        />
        <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>

      {/* live preview */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Preview</Text>
        <SvgUri width={120} height={120} uri={buildUri(selectedSeed || seedInput || "anonymous")} />
      </View>

      {/* grid */}
      <FlatList
        data={sampleSeeds}
        keyExtractor={(i) => i}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const uri = buildUri(item);
          const isSelected = selectedSeed === item || highlighted === item;
          return (
            <TouchableOpacity
              onPress={() => {
                setSelectedSeed(item);
                setSeedInput(item);
                setHighlighted(item);
              }}
              style={[
                styles.gridItem,
                { width: previewSize, height: previewSize + 8 },
                isSelected && styles.gridItemActive,
              ]}
            >
              <SvgUri width={previewSize - 12} height={previewSize - 12} uri={uri} />
              <Text numberOfLines={1} style={styles.gridLabel}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, backgroundColor: brandColors[0], borderRadius: 12 },
  title: {
    color: brandColors[10],
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  styleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  styleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: brandColors[4],
  },
  styleBtnActive: { backgroundColor: brandColors[12] },
  styleText: { color: brandColors[10], fontWeight: "700" },
  styleTextActive: { color: brandColors[10] },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: brandColors[4],
    padding: 10,
    borderRadius: 8,
    color: brandColors[10],
  },
  confirmBtn: {
    backgroundColor: brandColors[9],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  confirmText: { color: "#fff", fontWeight: "700" },
  preview: { alignItems: "center", marginBottom: 12 },
  previewLabel: { color: brandColors[7], marginBottom: 8 },
  grid: { paddingBottom: 8 },
  gridItem: {
    alignItems: "center",
    justifyContent: "center",
    margin: 6,
    borderRadius: 8,
    backgroundColor: brandColors[4],
    padding: 6,
  },
  gridItemActive: { borderColor: brandColors[9], borderWidth: 2 },
  gridLabel: {
    marginTop: 6,
    fontSize: 12,
    color: brandColors[10],
    fontWeight: "600",
  },
});
