export const supportsWebCodecsEncoding = (): boolean => {
	if (typeof window === "undefined") return false;
	return typeof window.VideoEncoder !== "undefined";
};
