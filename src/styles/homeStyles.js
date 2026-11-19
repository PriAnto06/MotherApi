import { StyleSheet } from "react-native";

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 44,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#AAAAAA",
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: "#1F2937",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  resetBtn: {
    backgroundColor: "#374151",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  imageContainer: {
    width: "100%",
    height: 310,
    position: "relative",
    backgroundColor: "#0A0A0A",
  },
  motherboardImage: {
    width: "100%",
    height: "100%",
  },
  cardContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardText: {
    color: "#E5E7EB",
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  placeholderCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#444444",
  },
  placeholderText: {
    color: "#9CA3AF",
    textAlign: "center",
    fontSize: 13,
  },
});
