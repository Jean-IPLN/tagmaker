"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SIZE_OPTIONS = ["1", "2"];

const SELECT_ITEMS = SIZE_OPTIONS.map((option) => ({
  value: option,
  label: option,
}));

const CHAR_PATTERN = /^[0-9A-Z#]$/;

function sanitizeChar(raw: string): string {
  const char = raw.slice(-1).toUpperCase();
  return CHAR_PATTERN.test(char) ? char : "";
}

export const LOCATION_CODE_PLACEHOLDERS = {
  classic: ["1", "A", "5", "1"],
  dynamic: ["1", "#", "D", "9"],
} as const;

export interface LocationCodeInputProps {
  labelPrefix: string;
  value: string;
  onChange: (code: string) => void;
  placeholders?: readonly [string, string, string, string];
  fixedIndexes?: readonly number[];
}

export function LocationCodeInput({
  labelPrefix,
  value,
  onChange,
  placeholders = LOCATION_CODE_PLACEHOLDERS.classic,
  fixedIndexes = EMPTY_FIXED,
}: LocationCodeInputProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const secondRef = useRef<HTMLInputElement>(null);
  const thirdRef = useRef<HTMLInputElement>(null);
  const fourthRef = useRef<HTMLInputElement>(null);
  const inputRefs = [secondRef, thirdRef, fourthRef];
  const segmentRefs = [firstRef, secondRef, thirdRef, fourthRef];

  const chars = [value[0] ?? "", value[1] ?? "", value[2] ?? "", value[3] ?? ""];

  const isFixed = (index: number) => fixedIndexes.includes(index);

  function nextEditable(from: number): number | null {
    for (let index = from + 1; index <= 3; index += 1) {
      if (!isFixed(index)) return index;
    }
    return null;
  }

  function previousEditable(from: number): number | null {
    for (let index = from - 1; index >= 0; index -= 1) {
      if (!isFixed(index)) return index;
    }
    return null;
  }

  function updateChar(index: number, char: string) {
    const next = [...chars];
    next[index] = char;
    for (const fix of fixedIndexes) {
      next[fix] = placeholders[fix];
    }
    onChange(next.join(""));

    const target = nextEditable(index);
    if (target !== null) {
      segmentRefs[target].current?.focus();
    }
  }

  function handleCharChange(index: number, raw: string) {
    if (raw === "") {
      updateChar(index, "");
      return;
    }
    const char = sanitizeChar(raw);
    if (char) {
      updateChar(index, char);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && chars[index] === "" && index > 0) {
      event.preventDefault();
      const target = previousEditable(index);
      if (target !== null) {
        segmentRefs[target].current?.focus();
      }
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      const target = previousEditable(index);
      if (target !== null) {
        segmentRefs[target].current?.focus();
      }
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const target = nextEditable(index);
      if (target !== null) {
        segmentRefs[target].current?.focus();
      }
    }
  }

  return (
    <div className="flex gap-2">
      <div className="w-full">
        <Select
          items={SELECT_ITEMS}
          value={chars[0] || null}
          onValueChange={(selected) => updateChar(0, selected ?? "")}
        >
          <SelectTrigger
            ref={firstRef}
            aria-label={`${labelPrefix} — 1er caractère`}
            className="w-full"
          >
            <SelectValue placeholder={placeholders[0]} />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner>
              <SelectPopup>
                <SelectList>
                  {SELECT_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <SelectItemText>{item.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
      </div>
      {[1, 2, 3].map((index) =>
        isFixed(index) ? (
          <div
            key={index}
            aria-label={`${labelPrefix} — ${index + 1}e caractère (fixe)`}
            className="flex h-8 w-full items-center justify-center rounded-lg border border-input bg-muted/50 px-2.5 text-base text-center text-muted-foreground select-none md:text-sm"
          >
            {placeholders[index]}
          </div>
        ) : (
          <Input
            key={index}
            ref={inputRefs[index - 1]}
            aria-label={`${labelPrefix} — ${index + 1}e caractère`}
            value={chars[index]}
            onChange={(event) => handleCharChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            maxLength={1}
            className="w-full text-center"
            placeholder={placeholders[index]}
            autoComplete="off"
          />
        )
      )}
    </div>
  );
}

const EMPTY_FIXED: readonly number[] = [];