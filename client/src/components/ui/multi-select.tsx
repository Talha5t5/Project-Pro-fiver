import React, { useState, useRef, useEffect } from "react";
import { Check, X, ChevronsUpDown, Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export type OptionType = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onPrimaryChange?: (primary: string) => void;
  primaryValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  onPrimaryChange,
  primaryValue,
  placeholder = "Seleziona",
  className,
  required = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  
  const handleUnselect = (item: string) => {
    const newSelected = selected.filter((i) => i !== item);
    onChange(newSelected);
    
    // Se l'elemento rimosso era l'elemento principale, imposta il primo elemento rimanente come principale
    if (onPrimaryChange && primaryValue === item && newSelected.length > 0) {
      onPrimaryChange(newSelected[0]);
    }
  };

  const handlePrimarySelect = (value: string) => {
    if (onPrimaryChange) {
      onPrimaryChange(value);
    }
  };

  // Filter options based on search query
  const filteredOptions = query === ""
    ? options
    : options.filter((option) =>
        option.label
          .toLowerCase()
          .includes(query.toLowerCase())
      );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-10",
            selected.length > 0 ? "h-auto" : "",
            className
          )}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className={cn("text-gray-500", required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {placeholder}
              </span>
            )}
            {selected.map((item) => {
              const option = options.find((option) => option.value === item);
              const isPrimary = primaryValue === item;
              
              return (
                <Badge
                  key={item}
                  variant={isPrimary ? "default" : "secondary"}
                  className={cn(
                    "mr-1 mb-1",
                    isPrimary && "border-2 border-primary"
                  )}
                >
                  {isPrimary && <Star className="h-3 w-3 mr-1 fill-current" />}
                  {option?.label}
                  <button
                    className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-1"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(item)}
                  >
                    <X className="h-3 w-3 text-gray-500 hover:text-gray-900" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Cerca..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                const isPrimary = primaryValue === option.value;
                
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      // Se non è selezionato, lo aggiungiamo
                      if (!isSelected) {
                        const newSelected = [...selected, option.value];
                        onChange(newSelected);
                        
                        // Se è il primo elemento aggiunto e abbiamo un handler per l'elemento principale
                        if (newSelected.length === 1 && onPrimaryChange) {
                          onPrimaryChange(option.value);
                        }
                      } else {
                        // Se è già selezionato, lo rimuoviamo
                        handleUnselect(option.value);
                      }
                    }}
                    className="flex justify-between"
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </div>
                    
                    {isSelected && onPrimaryChange && (
                      <Button
                        size="sm"
                        variant={isPrimary ? "default" : "outline"}
                        className="h-6 px-2 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrimarySelect(option.value);
                        }}
                      >
                        <Star className={cn("h-3 w-3", isPrimary && "fill-current")} />
                        <span className="ml-1 text-xs">
                          {isPrimary ? "Principale" : "Imposta principale"}
                        </span>
                      </Button>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}