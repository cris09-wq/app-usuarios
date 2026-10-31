
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "@/composables/useToast.js";

const limpiarToasts = () => {
    const { toasts, dismiss } = useToast();
    [...toasts].forEach((toast) => dismiss(toast.id));
};

describe("useToast", () => {
    beforeEach(() => {
        limpiarToasts();
    });

    afterEach(() => {
        vi.useRealTimers();
        limpiarToasts();
    });

    it("muestra un toast de éxito por defecto", () => {
        const { toasts, success } = useToast();

        const id = success("Guardado");

        expect(toasts).toHaveLength(1);
        expect(toasts[0]).toMatchObject({ id, message: "Guardado", type: "success" });
    });

    it("muestra un toast de error", () => {
        const { toasts, error } = useToast();

        error("Algo falló");

        expect(toasts[0]).toMatchObject({ message: "Algo falló", type: "error" });
    });

    it("puede apilar varios toasts con ids distintos", () => {
        const { toasts, success } = useToast();

        success("Uno");
        success("Dos");

        expect(toasts).toHaveLength(2);
        expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it("dismiss elimina un toast por id", () => {
        const { toasts, success, dismiss } = useToast();
        const id = success("Temporal");

        dismiss(id);

        expect(toasts).toHaveLength(0);
    });

    it("dismiss con un id inexistente no rompe nada", () => {
        const { toasts, success, dismiss } = useToast();
        success("Queda");

        dismiss(9999);

        expect(toasts).toHaveLength(1);
    });

    it("el toast de éxito se cierra solo a los 3,5 s", () => {
        vi.useFakeTimers();
        const { toasts, success } = useToast();

        success("Segundos");

        expect(toasts).toHaveLength(1);
        vi.advanceTimersByTime(3500);
        expect(toasts).toHaveLength(0);
    });

    it("el toast de error se cierra solo a los 5 s", () => {
        vi.useFakeTimers();
        const { toasts, error } = useToast();

        error("Fallo");

        vi.advanceTimersByTime(4999);
        expect(toasts).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(toasts).toHaveLength(0);
    });
});
