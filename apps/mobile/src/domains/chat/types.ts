export type ChatMsg = {
  type: "system" | "other" | "me";
  name?: string;
  text: string;
  time?: string;
};
