/**
 * @since 1.0.0
 */
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(async () => ({
	test: {
		environment: "jsdom"
	},

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	}
}));
