import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { insertPromotionalSpotSchema, type PromotionalSpot } from "@shared/schema";
import { useToast } from "../../hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Loader2, PlusCircle, X, Upload, ImagePlus } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { format } from "date-fns";
import { Checkbox } from "../../components/ui/checkbox";

// Estendi lo schema per la validazione del form
const spotFormSchema = insertPromotionalSpotSchema.extend({
  images: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeRanges: z
    .array(
      z.object({
        startTime: z.string().min(1, "Ora di inizio richiesta"),
        endTime: z.string().min(1, "Ora di fine richiesta"),
      })
    )
    .optional(),
  imageFiles: z.array(z.instanceof(File)).optional(),
  visiblePages: z.union([z.literal("all"), z.array(z.string())]),
  displayInterval: z.number().min(0).optional(),
  enableRedirect: z.boolean().default(false),
});

type SpotFormValues = z.infer<typeof spotFormSchema>;

type PromoSpotFormProps = {
  spot: PromotionalSpot | undefined;
  onCancel: () => void;
};

export default function PromoSpotForm({ spot, onCancel }: PromoSpotFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!spot;

  // State per la gestione dei file di immagine
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  
  // Lista delle pagine disponibili nell'app mobile
  const availablePages = [
    { id: "all", label: "Tutte le pagine" },
    { id: "/mobile", label: "Home mobile" },
    { id: "/mobile/welcome", label: "Benvenuto mobile" },
    { id: "/mobile/calendar", label: "Calendario mobile" },
    { id: "/mobile/jobs", label: "Lavori mobile" },
    { id: "/mobile/registration", label: "Registrazione mobile" },
    { id: "/mobile/report", label: "Report mobile" },
    { id: "/mobile/profile", label: "Profilo mobile" },
    { id: "/", label: "Home desktop" },
    { id: "/jobs", label: "Lavori desktop" },
    { id: "/calendar", label: "Calendario desktop" },
    { id: "/profile", label: "Profilo desktop" },
  ];
  
  // Imposta i valori predefiniti in base allo spot esistente o crea nuovi valori predefiniti
  const defaultValues: Partial<SpotFormValues> = {
    title: spot?.title || "",
    content: spot?.content || "",
    position: spot?.position || "bottom",
    textAnimationType: spot?.textAnimationType || "fixed",
    imageDisplayType: spot?.imageDisplayType || "single",
    status: spot?.status || "inactive",
    // spot.images can be stored as JSON string in DB; ensure string for input
    images: Array.isArray((spot as any)?.images)
      ? ((spot as any).images as string[]).join(",")
      : (typeof (spot as any)?.images === 'string' ? (spot as any).images : ""),
    height: spot?.height || 200,
    width: spot?.width || 300,
    startDate: spot?.startDate ? format(new Date(spot.startDate), "yyyy-MM-dd") : "",
    endDate: spot?.endDate ? format(new Date(spot.endDate), "yyyy-MM-dd") : "",
    redirectUrl: spot?.redirectUrl || "",
    enableRedirect: spot?.enableRedirect || false,
    displayDuration: spot?.displayDuration || 5,
    timeRanges: Array.isArray((spot as any)?.timeRanges)
      ? (spot as any).timeRanges
      : [{ startTime: "", endTime: "" }],
    visiblePages: ((): any => {
      const vp = (spot as any)?.visiblePages;
      if (!vp) return "all";
      if (vp === "all") return "all";
      try {
        const parsed = typeof vp === 'string' ? JSON.parse(vp) : vp;
        return Array.isArray(parsed) ? parsed : "all";
      } catch {
        return typeof vp === 'string' ? vp : "all";
      }
    })(),
    imageFiles: [],
  };

  const form = useForm<SpotFormValues>({
    resolver: zodResolver(spotFormSchema),
    defaultValues,
  });

  // Mutation per creare un nuovo spot
  const createSpotMutation = useMutation({
    mutationFn: async (data: SpotFormValues) => {
      // Converti e serializza i campi per il backend (colonne TEXT)
      const processedData = {
        ...data,
        // Assicurati che position sia fornito (obbligatorio)
        position: data.position || "top",
        // Serializza immagini come JSON string
        images: data.images && data.images.trim().length > 0
          ? JSON.stringify(data.images.split(",").map(img => img.trim()))
          : JSON.stringify([]),
        // Imposta esplicitamente enableRedirect se non è definito
        enableRedirect: data.enableRedirect === undefined ? false : data.enableRedirect,
        // Serializza timeRanges come JSON string
        timeRanges: data.timeRanges && data.timeRanges.length > 0 &&
                    data.timeRanges[0].startTime && data.timeRanges[0].endTime
                    ? JSON.stringify(data.timeRanges)
                    : JSON.stringify([]),
        // Gestisci correttamente visiblePages (all o array di stringhe) serializzando gli array
        visiblePages: Array.isArray(data.visiblePages)
          ? (data.visiblePages.length === 0 ? "all" : JSON.stringify(data.visiblePages))
          : (data.visiblePages || "all"),
        // Date correttamente formattate o null
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        // Gestisci intervallo per visualizzazione intermittente
        displayInterval: data.displayInterval || 0
      };
      
      console.log("Invio spot:", processedData);
      const res = await apiRequest("POST", "/api/admin/promotional-spots", processedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Spot creato",
        description: "Lo spot promozionale è stato creato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotional-spots'] });
      onCancel(); // Chiudi il form e torna alla lista
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante la creazione dello spot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare uno spot esistente
  const updateSpotMutation = useMutation({
    mutationFn: async (data: SpotFormValues & { id: number }) => {
      // Converti le immagini da stringa separata da virgole in array
      const { id, ...restData } = data;
      const processedData = {
        ...restData,
        // Assicurati che position sia fornito (obbligatorio)
        position: data.position || "top",
        // Serializza immagini come JSON string
        images: data.images && data.images.trim().length > 0
          ? JSON.stringify(data.images.split(",").map(img => img.trim()))
          : JSON.stringify([]),
        // Imposta esplicitamente enableRedirect se non è definito
        enableRedirect: data.enableRedirect === undefined ? false : data.enableRedirect,
        // Serializza timeRanges come JSON string
        timeRanges: data.timeRanges && data.timeRanges.length > 0 &&
                    data.timeRanges[0].startTime && data.timeRanges[0].endTime
                    ? JSON.stringify(data.timeRanges)
                    : JSON.stringify([]),
        // Serializza visiblePages se è un array
        visiblePages: Array.isArray(data.visiblePages)
          ? (data.visiblePages.length === 0 ? "all" : JSON.stringify(data.visiblePages))
          : (data.visiblePages || "all"),
        // Date correttamente formattate o null
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        // Gestisci intervallo per visualizzazione intermittente
        displayInterval: data.displayInterval || 0
      };
      
      console.log("Aggiornamento spot:", processedData);
      const res = await apiRequest("PATCH", `/api/admin/promotional-spots/${id}`, processedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Spot aggiornato",
        description: "Lo spot promozionale è stato aggiornato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotional-spots'] });
      onCancel(); // Chiudi il form e torna alla lista
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante l'aggiornamento dello spot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SpotFormValues) => {
    if (isEditing && spot) {
      updateSpotMutation.mutate({ ...data, id: spot.id });
    } else {
      createSpotMutation.mutate(data);
    }
  };

  const isPending = createSpotMutation.isPending || updateSpotMutation.isPending;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Modifica Spot Promozionale" : "Nuovo Spot Promozionale"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci il titolo dello spot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenuto</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Inserisci il contenuto dello spot" 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posizione</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona la posizione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="top">In alto</SelectItem>
                        <SelectItem value="bottom">In basso</SelectItem>
                        <SelectItem value="left">A sinistra</SelectItem>
                        <SelectItem value="popup">Popup</SelectItem>
                      </SelectContent>
                    <FormDescription>
                      {form.watch("position") === "top" && "Dimensioni consigliate: Larghezza 100%, Altezza 60-100px"}
                      {form.watch("position") === "bottom" && "Dimensioni consigliate: Larghezza 100%, Altezza 60-100px"}
                      {form.watch("position") === "left" && "Dimensioni consigliate: Larghezza 30-40%, Altezza 300-500px"}
                      {form.watch("position") === "popup" && "Dimensioni consigliate: Larghezza 80-90%, Altezza 300-500px"}
                    </FormDescription>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="textAnimationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo di animazione</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tipo di animazione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fisso</SelectItem>
                        <SelectItem value="scroll">Scorrimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="imageDisplayType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visualizzazione immagini</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tipo di visualizzazione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Singola immagine</SelectItem>
                        <SelectItem value="slideshow">Presentazione</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona lo stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Attivo</SelectItem>
                        <SelectItem value="inactive">Inattivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sezione pagine visibili */}
            <div className="space-y-4 border rounded-md p-4 bg-gray-50">
              <h3 className="text-lg font-medium">Pagine visibili</h3>
              <FormField
                control={form.control}
                name="visiblePages"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Seleziona le pagine in cui mostrare lo spot:</FormLabel>
                      <FormDescription>
                        Scegli "Tutte le pagine" oppure seleziona pagine specifiche.
                      </FormDescription>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-pages"
                          checked={field.value === "all"}
                          onCheckedChange={() => field.onChange("all")}
                        />
                        <label
                          htmlFor="all-pages"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Mostra in tutte le pagine
                        </label>
                      </div>
                      
                      {field.value !== "all" && (
                        <div className="ml-6 space-y-2 mt-2 border-l-2 pl-4 border-gray-200">
                          {availablePages.filter(page => page.id !== "all").map((page) => (
                            <div key={page.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`page-${page.id}`}
                                checked={Array.isArray(field.value) && field.value.includes(page.id)}
                                onCheckedChange={(checked) => {
                                  if (!Array.isArray(field.value)) {
                                    // Se non è un array (all), crea un nuovo array con questo valore
                                    field.onChange([page.id]);
                                  } else {
                                    if (checked) {
                                      // Aggiungi la pagina all'array
                                      field.onChange([...field.value, page.id]);
                                    } else {
                                      // Rimuovi la pagina dall'array
                                      field.onChange(field.value.filter(id => id !== page.id));
                                      // Se non rimane nessuna pagina, imposta a "all"
                                      if (field.value.length === 0) {
                                        field.onChange("all");
                                      }
                                    }
                                  }
                                }}
                              />
                              <label
                                htmlFor={`page-${page.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {page.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Immagini dello spot</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL delle immagini</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="URL delle immagini separate da virgola" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Inserisci gli URL delle immagini separati da virgole.
                        </FormDescription>
                        <FormMessage />
                        
                        <div className="border rounded-md p-4 mt-4">
                          <h4 className="text-md font-medium mb-2">Carica nuove immagini</h4>
                          <div className="flex items-center justify-center w-full">
                            <label htmlFor="imageUpload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100/50">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Clicca per caricare</span> o trascina qui i file
                                </p>
                                <p className="text-xs text-gray-500">
                                  SVG, PNG, JPG o GIF (max. 2MB)
                                </p>
                              </div>
                              <input 
                                id="imageUpload" 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    // Qui puoi aggiungere la logica per caricare le immagini
                                    // Per ora, le mostriamo solo in anteprima
                                    const files = Array.from(e.target.files);
                                    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
                                    setPreviewImages(prev => [...prev, ...newPreviewUrls]);
                                    
                                    // Aggiorna il form con gli URL o percorsi delle immagini
                                    // Utilizziamo URL relativi ai file statici in public per la demo
                                    console.log("Immagini attuali:", field.value);
                                    const currentUrls = field.value ? 
                                      (Array.isArray(field.value) ? field.value : field.value.split(',').map(url => url.trim())) 
                                      : [];
                                    
                                    // Usiamo immagini predefinite di esempio per non richiedere multer
                                    // Queste immagini esistono già nella directory client/public
                                    const demoImages = [
                                      "/demo-image1.jpg",
                                      "/demo-image2.jpg",
                                      "/demo-image3.jpg",
                                      "/logo.svg",
                                      "/logo.png"
                                    ];
                                    
                                    // Generiamo URL distribuendo le immagini demo in modo casuale
                                    // Questo è solo per dimostrare la funzionalità
                                    const newUrls = [
                                      ...currentUrls, 
                                      ...files.map((_, i) => demoImages[i % demoImages.length])
                                    ].filter(Boolean);
                                    
                                    console.log("Nuovi URL immagini:", newUrls);
                                    
                                    // Impostiamo il valore come array
                                    if (Array.isArray(field.value)) {
                                      form.setValue('images', newUrls);
                                    } else {
                                      // Se il campo accetta stringhe, converte l'array in stringa
                                      form.setValue('images', newUrls.join(','));
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        
                        {previewImages.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium mb-2">Anteprima immagini</h5>
                            <div className="grid grid-cols-3 gap-2">
                              {previewImages.map((url, idx) => (
                                <div key={idx} className="relative group">
                                  <img 
                                    src={url} 
                                    alt={`Preview ${idx}`} 
                                    className="h-24 w-full object-cover rounded-md" 
                                  />
                                  <button
                                    type="button"
                                    className="absolute top-1 right-1 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      // Rimuovi l'anteprima
                                      setPreviewImages(prev => prev.filter((_, i) => i !== idx));
                                      
                                      // Aggiorna anche il campo immagini
                                      const currentImages = form.getValues('images');
                                      
                                      if (!currentImages) return;
                                      
                                      if (Array.isArray(currentImages)) {
                                        // Se è un array, rimuovi l'elemento
                                        if (currentImages.length > idx) {
                                          const newImages = [...currentImages];
                                          newImages.splice(idx, 1);
                                          form.setValue('images', newImages);
                                        }
                                      } else if (typeof currentImages === 'string') {
                                        // Se è una stringa, dividila, rimuovi e ricombina
                                        const images = currentImages.split(',').map(img => img.trim());
                                        if (images.length > idx) {
                                          images.splice(idx, 1);
                                          form.setValue('images', images.join(','));
                                        }
                                      }
                                    }}
                                  >
                                    <X size={14} className="text-destructive" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altezza (px)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Altezza in px" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Larghezza (px)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Larghezza in px" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border rounded-md p-4 mb-4 bg-gray-50/10">
              <h3 className="text-md font-medium mb-4">Periodo di validità dello spot</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data di inizio validità</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lascia vuoto per mostrare lo spot da subito
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data di fine validità</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lascia vuoto per mostrare lo spot senza scadenza
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="border rounded-md p-4 mb-4 bg-gray-50/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium">Fasce orarie giornaliere</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const timeRanges = form.getValues("timeRanges") || [];
                    form.setValue("timeRanges", [...timeRanges, { startTime: "", endTime: "" }]);
                  }}
                  className="flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  <span>Aggiungi fascia oraria</span>
                </Button>
              </div>
              
              <div className="space-y-3">
                {form.watch("timeRanges")?.map((_, index) => (
                  <div key={index} className="flex items-end gap-3 border p-3 rounded-md">
                    <FormField
                      control={form.control}
                      name={`timeRanges.${index}.startTime`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Ora di inizio</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`timeRanges.${index}.endTime`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Ora di fine</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-2"
                      onClick={() => {
                        const timeRanges = form.getValues("timeRanges") || [];
                        if (timeRanges.length > 1) {
                          form.setValue(
                            "timeRanges",
                            timeRanges.filter((_, i) => i !== index)
                          );
                        }
                      }}
                      disabled={form.watch("timeRanges")?.length === 1}
                    >
                      <X size={16} className="text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <FormDescription className="mt-2">
                Puoi aggiungere più fasce orarie per mostrare lo spot in diversi momenti della giornata.
                Ad esempio: 9:00-13:00, 14:00-18:00, 22:00-24:00.
              </FormDescription>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="enableRedirect"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Attiva reindirizzamento</FormLabel>
                      <FormDescription>
                        Attiva/disattiva il reindirizzamento quando si clicca sull'immagine
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            
              <FormField
                control={form.control}
                name="redirectUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL di reindirizzamento</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="URL al quale reindirizzare l'utente" 
                        {...field} 
                        disabled={!form.watch("enableRedirect")}
                      />
                    </FormControl>
                    <FormDescription>
                      Questo URL sarà utilizzato solo se il reindirizzamento è attivo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durata visualizzazione (secondi)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Durata in secondi" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Tempo di visualizzazione dello spot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="displayInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervallo di ripetizione (secondi)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Intervallo in secondi" 
                        {...field || { value: 0 }}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Tempo tra una visualizzazione e l'altra (0 = sempre visibile)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Aggiorna" : "Crea"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}