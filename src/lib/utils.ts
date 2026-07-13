import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (ClassValue | undefined | null)[]): any {
	return twMerge(clsx(inputs.filter(Boolean) as ClassValue[]));
}

export function cnClass(...inputs: (ClassValue | undefined | null)[]): string {
	return cn(...inputs);
}

