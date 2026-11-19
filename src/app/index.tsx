import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

export interface BoxNorm {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedComponent {
  id: string;
  box: BoxNorm;
  confidence?: number;
}

interface ComponentInfo {
  id: string;
  name: string;
  description: string;
  functionText: string;
  criticality: string;
  color: string;
  defaultBox: BoxNorm;
}

const COMPONENTS_DATA: ComponentInfo[] = [
  {
    id: "cooler",
    name: "Cooler CPU (APS-5028)",
    description:
      "Ventilador y disipador montado sobre el sector del procesador.",
    functionText:
      "Extrae el calor generado por los circuitos para mantener temperaturas estables.",
    criticality: "Crítico",
    color: "#22D3EE",
    defaultBox: { x: 0.098, y: 0.235, width: 0.175, height: 0.25 },
  },
  {
    id: "cpu_intel",
    name: "Chip / Zócalo Intel",
    description:
      "Circuito integrado de procesamiento / control en la zona superior izquierda.",
    functionText:
      "Ejecuta operaciones de cálculo y coordina señales de la placa.",
    criticality: "Muy Crítico",
    color: "#F87171",
    defaultBox: { x: 0.148, y: 0.068, width: 0.132, height: 0.165 },
  },
  {
    id: "expansion_slots",
    name: "Ranuras de Expansión",
    description:
      "Conjunto de ranuras verticales (marrón y blancas) en el centro de la placa.",
    functionText:
      "Permiten conectar tarjetas de expansión para ampliar funciones del equipo.",
    criticality: "No Crítico",
    color: "#FB923C",
    defaultBox: { x: 0.258, y: 0.225, width: 0.222, height: 0.47 },
  },
  {
    id: "ide_ports",
    name: "Conectores IDE",
    description: "Conectores multipin negros ubicados abajo a la izquierda.",
    functionText:
      "Conectan unidades de almacenamiento o periféricos mediante faja de datos.",
    criticality: "No Crítico",
    color: "#F472B6",
    defaultBox: { x: 0.108, y: 0.658, width: 0.195, height: 0.152 },
  },
  {
    id: "power_connector",
    name: "Conector de Alimentación",
    description: "Conector blanco de energía situado en la parte inferior.",
    functionText:
      "Recibe la alimentación eléctrica desde la fuente hacia la placa base.",
    criticality: "Crítico",
    color: "#FDE047",
    defaultBox: { x: 0.288, y: 0.74, width: 0.174, height: 0.082 },
  },
  {
    id: "nec_chipset",
    name: "Chipset / Controlador NEC",
    description: "Circuito integrado principal en el sector central-derecho.",
    functionText:
      "Gestiona la comunicación entre buses, memoria y dispositivos de la placa.",
    criticality: "Muy Crítico",
    color: "#C084FC",
    defaultBox: { x: 0.478, y: 0.275, width: 0.142, height: 0.188 },
  },
  {
    id: "battery",
    name: "Batería de Litio (SANYO)",
    description: "Pila/batería azul ubicada en la esquina inferior derecha.",
    functionText:
      "Conserva parámetros de configuración y el reloj interno sin energía principal.",
    criticality: "No Crítico",
    color: "#38BDF8",
    defaultBox: { x: 0.638, y: 0.708, width: 0.092, height: 0.132 },
  },
  {
    id: "upper_slots",
    name: "Conectores Superiores",
    description: "Ranuras y conectores alineados en la parte superior derecha.",
    functionText:
      "Sirven para expansión o interconexión de módulos adicionales.",
    criticality: "No Crítico",
    color: "#34D399",
    defaultBox: { x: 0.545, y: 0.012, width: 0.295, height: 0.205 },
  },
];

const VALID_IDS = new Set(COMPONENTS_DATA.map((c) => c.id));

function buildInitialBoxes(): Record<string, BoxNorm> {
  const map: Record<string, BoxNorm> = {};
  for (const item of COMPONENTS_DATA) {
    map[item.id] = { ...item.defaultBox };
  }
  return map;
}

function buildInitialEnabled(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const item of COMPONENTS_DATA) {
    map[item.id] = true;
  }
  return map;
}

function getContainedImageRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
) {
  if (!containerW || !containerH) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  if (!naturalW || !naturalH) {
    return { x: 0, y: 0, width: containerW, height: containerH };
  }
  const containerRatio = containerW / containerH;
  const imageRatio = naturalW / naturalH;

  if (imageRatio > containerRatio) {
    const width = containerW;
    const height = containerW / imageRatio;
    return { x: 0, y: (containerH - height) / 2, width, height };
  }
  const height = containerH;
  const width = containerH * imageRatio;
  return { x: (containerW - width) / 2, y: 0, width, height };
}

const showNotice = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number(val.toFixed(3))));

export default function HomeScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [boxes, setBoxes] =
    useState<Record<string, BoxNorm>>(buildInitialBoxes);
  const [enabledMap, setEnabledMap] =
    useState<Record<string, boolean>>(buildInitialEnabled);
  const [filterMode, setFilterMode] = useState<boolean>(false);
  const [calibrateMode, setCalibrateMode] = useState<boolean>(false);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 1200, height: 900 });

  const visibleComponents = useMemo(
    () => COMPONENTS_DATA.filter((c) => enabledMap[c.id] !== false),
    [enabledMap],
  );

  const selectedComponent = useMemo(
    () =>
      selectedId
        ? (visibleComponents.find((c) => c.id === selectedId) ?? null)
        : null,
    [visibleComponents, selectedId],
  );

  const imgRect = useMemo(
    () =>
      getContainedImageRect(
        layout.width,
        layout.height,
        imageSize.width,
        imageSize.height,
      ),
    [layout.width, layout.height, imageSize.width, imageSize.height],
  );

  const applyDetectedComponents = (detections: DetectedComponent[]) => {
    const nextEnabled: Record<string, boolean> = {};
    for (const item of COMPONENTS_DATA) {
      nextEnabled[item.id] = false;
    }

    setBoxes((prev) => {
      const updated = { ...prev };
      for (const det of detections) {
        if (!VALID_IDS.has(det.id)) continue;
        nextEnabled[det.id] = true;
        const w = clamp(det.box.width, 0.02, 1);
        const h = clamp(det.box.height, 0.02, 1);
        const x = clamp(det.box.x, 0, 1 - w);
        const y = clamp(det.box.y, 0, 1 - h);
        updated[det.id] = { x, y, width: w, height: h };
      }
      return updated;
    });

    setEnabledMap(nextEnabled);
    const firstFound = detections.find((d) => VALID_IDS.has(d.id));
    setSelectedId(firstFound ? firstFound.id : null);
  };

  const toggleComponentPresent = (id: string) => {
    setEnabledMap((prev) => {
      const nextVal = !(prev[id] !== false);
      const updated = { ...prev, [id]: nextVal };
      if (!nextVal && selectedId === id) {
        setSelectedId(null);
      } else if (nextVal) {
        setSelectedId(id);
      }
      return updated;
    });
  };

  const adjustBox = (dx: number, dy: number, dw: number, dh: number) => {
    if (!selectedComponent) return;
    const id = selectedComponent.id;
    setBoxes((prev) => {
      const curr = prev[id];
      if (!curr) return prev;
      const width = clamp(curr.width + dw, 0.04, 0.9);
      const height = clamp(curr.height + dh, 0.04, 0.9);
      const x = clamp(curr.x + dx, 0, 1 - width);
      const y = clamp(curr.y + dy, 0, 1 - height);
      return {
        ...prev,
        [id]: { x, y, width, height },
      };
    });
  };

  const resetSelectedBox = () => {
    if (!selectedComponent) return;
    setBoxes((prev) => ({
      ...prev,
      [selectedComponent.id]: { ...selectedComponent.defaultBox },
    }));
  };

  const pickImageFromGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showNotice(
            "Permiso necesario",
            "Activá el permiso de galería para subir una imagen.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        setUploadedUri(asset.uri);
        if (asset.width && asset.height) {
          setImageSize({ width: asset.width, height: asset.height });
        }
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
      showNotice("Error", "No se pudo abrir la galería.");
    }
  };

  const takePhotoWithCamera = async () => {
    if (Platform.OS === "web") {
      showNotice(
        "Cámara no disponible en web",
        'Usá "Subir imagen" en el navegador o probá "Sacar foto" desde Expo Go en tu celular.',
      );
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showNotice(
          "Permiso necesario",
          "Activá el permiso de cámara para sacar una foto.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        setUploadedUri(asset.uri);
        if (asset.width && asset.height) {
          setImageSize({ width: asset.width, height: asset.height });
        }
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
      showNotice("Error", "No se pudo abrir la cámara.");
    }
  };

  const hasImage = Boolean(uploadedUri);
  const activeBox = selectedComponent ? boxes[selectedComponent.id] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Motherboard Guide</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LOCAL · SIN IA</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Tocá un recuadro para ver su ficha, filtrá componentes o calibrá
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={pickImageFromGallery}
        >
          <Text style={styles.primaryBtnText}>Subir imagen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={takePhotoWithCamera}
        >
          <Text style={styles.secondaryBtnText}>Sacar foto</Text>
        </TouchableOpacity>

        {hasImage && (
          <TouchableOpacity
            style={[styles.modeBtn, filterMode && styles.modeBtnActive]}
            onPress={() => {
              setFilterMode((v) => !v);
              setCalibrateMode(false);
            }}
          >
            <Text
              style={[
                styles.modeBtnText,
                filterMode && styles.modeBtnTextActive,
              ]}
            >
              {filterMode ? "Listo placa" : "Componentes"}
            </Text>
          </TouchableOpacity>
        )}

        {hasImage && (
          <TouchableOpacity
            style={[styles.modeBtn, calibrateMode && styles.modeBtnActive]}
            onPress={() => {
              setCalibrateMode((v) => !v);
              setFilterMode(false);
            }}
          >
            <Text
              style={[
                styles.modeBtnText,
                calibrateMode && styles.modeBtnTextActive,
              ]}
            >
              {calibrateMode ? "Listo" : "Calibrar"}
            </Text>
          </TouchableOpacity>
        )}

        {hasImage && (
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => {
              setUploadedUri(null);
              setImageSize({ width: 1200, height: 900 });
              setCalibrateMode(false);
              setFilterMode(false);
              setSelectedId(null);
              setEnabledMap(buildInitialEnabled());
              setBoxes(buildInitialBoxes());
            }}
          >
            <Text style={styles.ghostBtnText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasImage && filterMode && (
        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>
            Activá o quitá los componentes presentes en esta placa:
          </Text>
          <View style={styles.filterWrap}>
            {COMPONENTS_DATA.map((item) => {
              const present = enabledMap[item.id] !== false;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleComponentPresent(item.id)}
                  style={[
                    styles.filterChip,
                    present && {
                      borderColor: item.color,
                      backgroundColor: "#172554",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      present && styles.filterChipTextActive,
                    ]}
                  >
                    {present ? "✓ " : "+ "}
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {hasImage && !filterMode && visibleComponents.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {visibleComponents.map((item) => {
            const active = selectedComponent?.id === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedId(item.id)}
                style={[
                  styles.compChip,
                  active && {
                    borderColor: item.color,
                    backgroundColor: "#172554",
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text
                  style={[
                    styles.compChipText,
                    active && styles.compChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View
        style={styles.viewer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setLayout({ width, height });
          }
        }}
      >
        {hasImage && uploadedUri ? (
          <View style={styles.viewerInner}>
            <Image
              source={{ uri: uploadedUri }}
              style={styles.image}
              resizeMode="contain"
              onLoad={(e) => {
                const src = e?.nativeEvent?.source;
                if (src?.width && src?.height) {
                  setImageSize({ width: src.width, height: src.height });
                } else if (uploadedUri) {
                  Image.getSize(
                    uploadedUri,
                    (w, h) => {
                      if (w && h) setImageSize({ width: w, height: h });
                    },
                    () => {},
                  );
                }
              }}
            />

            {imgRect.width > 0 &&
              imgRect.height > 0 &&
              visibleComponents.map((item) => {
                const box = boxes[item.id] ?? item.defaultBox;
                const isSelected = selectedComponent?.id === item.id;
                const left = imgRect.x + box.x * imgRect.width;
                const top = imgRect.y + box.y * imgRect.height;
                const width = Math.max(box.width * imgRect.width, 22);
                const height = Math.max(box.height * imgRect.height, 22);

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedId(item.id)}
                    style={{
                      position: "absolute",
                      left,
                      top,
                      width,
                      height,
                      borderColor: item.color,
                      borderWidth: isSelected ? 3 : 2,
                      borderRadius: 4,
                      backgroundColor: isSelected
                        ? `${item.color}33`
                        : `${item.color}14`,
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          backgroundColor: "#0B0F17EE",
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                          borderRadius: 3,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color: item.color,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          {item.name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin imagen cargada</Text>
            <Text style={styles.emptyDesc}>
              Subí o sacá una foto de la placa madre para empezar.
            </Text>
          </View>
        )}
      </View>

      {hasImage && calibrateMode && selectedComponent && activeBox && (
        <View style={styles.calibratorBox}>
          <Text style={styles.calibratorTitle}>
            Ajustando: {selectedComponent.name}
          </Text>
          <View style={styles.ctrlRow}>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => adjustBox(-0.02, 0, 0, 0)}
            >
              <Text style={styles.ctrlText}>← Izq</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => adjustBox(0, -0.02, 0, 0)}
            >
              <Text style={styles.ctrlText}>↑ Arriba</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => adjustBox(0, 0.02, 0, 0)}
            >
              <Text style={styles.ctrlText}>↓ Abajo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => adjustBox(0.02, 0, 0, 0)}
            >
              <Text style={styles.ctrlText}>Der →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ctrlRow}>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => adjustBox(0, 0, -0.02, -0.02)}
            >
              <Text style={styles.ctrlText}>- Tamaño</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => adjustBox(0, 0, 0.02, 0.02)}
            >
              <Text style={styles.ctrlText}>+ Tamaño</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={resetSelectedBox}>
              <Text style={styles.ctrlText}>Reiniciar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coordsText}>
            x: {activeBox.x} · y: {activeBox.y} · w: {activeBox.width} · h:{" "}
            {activeBox.height}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.sheetArea}
        contentContainerStyle={styles.sheetContent}
      >
        {selectedComponent ? (
          <View
            style={[
              styles.detailCard,
              { borderLeftColor: selectedComponent.color, borderLeftWidth: 4 },
            ]}
          >
            <Text style={styles.detailTitle}>{selectedComponent.name}</Text>

            <View style={styles.critPill}>
              <Text
                style={[
                  styles.critText,
                  {
                    color:
                      selectedComponent.criticality === "No Crítico"
                        ? "#34D399"
                        : "#F87171",
                  },
                ]}
              >
                {selectedComponent.criticality}
              </Text>
            </View>

            <Text style={styles.label}>Qué es</Text>
            <Text style={styles.value}>{selectedComponent.description}</Text>

            <Text style={styles.label}>Para qué sirve / Función</Text>
            <Text style={styles.value}>{selectedComponent.functionText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F17", paddingTop: 40 },
  header: { paddingHorizontal: 18, marginBottom: 8 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#F8FAFC", fontSize: 20, fontWeight: "700" },
  badge: {
    backgroundColor: "#132A3A",
    borderColor: "#1E4966",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { color: "#38BDF8", fontSize: 10, fontWeight: "700" },
  subtitle: { color: "#94A3B8", fontSize: 13, marginTop: 4 },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  secondaryBtn: {
    backgroundColor: "#161E2E",
    borderWidth: 1,
    borderColor: "#2B3A55",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryBtnText: { color: "#E2E8F0", fontWeight: "600", fontSize: 13 },
  modeBtn: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: "#1E3A8A", borderColor: "#60A5FA" },
  modeBtnText: { color: "#CBD5E1", fontWeight: "600", fontSize: 13 },
  modeBtnTextActive: { color: "#FFFFFF" },
  ghostBtn: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10 },
  ghostBtnText: { color: "#94A3B8", fontWeight: "600", fontSize: 13 },
  filterBox: {
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  filterTitle: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#0B0F17",
    borderWidth: 1,
    borderColor: "#374151",
  },
  filterChipText: { color: "#94A3B8", fontSize: 11, fontWeight: "600" },
  filterChipTextActive: { color: "#F8FAFC" },
  chipsScroll: { maxHeight: 40, marginBottom: 8 },
  chipsRow: { paddingHorizontal: 18, gap: 8, alignItems: "center" },
  compChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  compChipText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  compChipTextActive: { color: "#F8FAFC" },
  viewer: {
    marginHorizontal: 18,
    height: 270,
    borderRadius: 14,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
    position: "relative",
  },
  viewerInner: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  emptyState: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyDesc: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  calibratorBox: {
    marginHorizontal: 18,
    marginTop: 10,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  calibratorTitle: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  ctrlRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  ctrlBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ctrlText: { color: "#F8FAFC", fontSize: 12, fontWeight: "600" },
  coordsText: { color: "#94A3B8", fontSize: 11 },
  sheetArea: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  sheetContent: { paddingBottom: 24 },
  detailCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  detailTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  critPill: {
    alignSelf: "flex-start",
    backgroundColor: "#0B0F17",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  critText: { fontSize: 12, fontWeight: "700" },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { color: "#E2E8F0", fontSize: 14, lineHeight: 20, marginBottom: 10 },
});
