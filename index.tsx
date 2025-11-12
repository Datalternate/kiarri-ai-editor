import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

const App = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const presets = [
        { name: 'Savanna Gold', prompt: 'Apply a warm, golden hour filter, enhancing oranges and yellows, reminiscent of a savanna sunset.' },
        { name: 'Ankara Pop', prompt: 'Boost the color saturation and contrast dramatically, making patterns pop like in vibrant Ankara fabric.' },
        { name: 'Kente Weave', prompt: 'Add a subtle cross-hatch texture overlay and slightly desaturate the colors, mimicking the look of Kente cloth.' },
        { name: 'Nollywood Drama', prompt: 'Increase the contrast and add a slight cinematic blue tint to the shadows for a dramatic, film-like effect.' },
        { name: 'Masai Red', prompt: 'Make all red tones in the image deeper and more vibrant, inspired by the iconic Masai shuka.' },
        { name: 'Remove Background', prompt: 'Remove the background of this image, keeping only the main subject with a transparent or neutral background.' },
        { name: 'Change Cloth Color', prompt: 'Change the color of the main person\'s clothing to [specify color, e.g., vibrant red].' },
        { name: 'Change Cloth Type', prompt: 'Change the main person\'s outfit to a [specify style, e.g., formal suit, leather jacket].' },
        { name: 'Van Gogh', prompt: 'Transform this photo into a Van Gogh-style painting, with thick, swirling impasto brushstrokes and vibrant, expressive colors.' },
        { name: 'Comic Book', prompt: 'Convert this image into a comic book style, with bold black outlines, vibrant flat colors, and halftone dot shading.' },
        { name: 'Rick and Morty', prompt: 'Convert this image into the style of Rick and Morty, characterized by Surreal sci-fi, dark humor, neon palettes.' },
        { name: 'BoJack Horseman', prompt: 'Convert this image into the style of BoJack Horseman, characterized by Flat 2D, emotional satire, muted colors.' },
        { name: 'South Park', prompt: 'Convert this image into the style of South Park, characterized by Cutout animation, crude humor, fast production.' },
        { name: 'The Simpsons', prompt: 'Convert this image into the style of The Simpsons, characterized by Classic 2D sitcom, iconic yellow characters.' },
        { name: 'Family Guy', prompt: 'Convert this image into the style of Family Guy, characterized by Sitcom-style 2D, absurd gags, pop culture.' },
        { name: 'Big Mouth', prompt: 'Convert this image into the style of Big Mouth, characterized by Exaggerated 2D, edgy humor, puberty themes.' },
        { name: 'Avatar: The Last Airbender', prompt: 'Convert this image into the style of Avatar: The Last Airbender, characterized by Anime-inspired 2D, elemental powers, epic story.' },
        { name: 'Adventure Time', prompt: 'Convert this image into the style of Adventure Time, characterized by Whimsical, surreal, abstract characters.' },
        { name: 'Gravity Falls', prompt: 'Convert this image into the style of Gravity Falls, characterized by Mystery, forest tones, cryptic symbols.' },
        { name: 'Steven Universe', prompt: 'Convert this image into the style of Steven Universe, characterized by Soft pastel 2D, emotional depth, identity themes.' },
        { name: 'The Owl House', prompt: 'Convert this image into the style of The Owl House, characterized by Fantasy, anime-inspired, magical world.' },
        { name: 'Arcane', prompt: 'Convert this image into the style of Arcane, characterized by Painterly 3D, cinematic lighting, League of Legends universe.' },
        { name: 'Love, Death & Robots', prompt: 'Convert this image into the style of Love, Death & Robots, characterized by Mixed styles, experimental visuals, anthology.' },
        { name: 'Star Wars: The Clone Wars', prompt: 'Convert this image into the style of Star Wars: The Clone Wars, characterized by Stylized 3D, action, lore-rich.' },
        { name: 'Trollhunters', prompt: 'Convert this image into the style of Trollhunters, characterized by DreamWorks CGI, fantasy adventure.' }
    ];

    const processImageFile = (file: File) => {
        setImageFile(file);
        setGeneratedImageUrl(null);
        setError(null);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageDataUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        processImageFile(file);
                        event.preventDefault();
                        return;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);

        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processImageFile(e.target.files[0]);
        }
    };

    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1];
                resolve(base64Data);
            };
            reader.readAsDataURL(file);
        });
        return {
            inlineData: {
                data: await base64EncodedDataPromise,
                mimeType: file.type
            },
        };
    };

    const handleSubmit = async () => {
        if (!imageFile || !prompt) {
            setError('Please upload an image and provide a prompt.');
            return;
        }

        setIsLoading(true);
        setGeneratedImageUrl(null);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const imagePart = await fileToGenerativePart(imageFile);
            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [imagePart, textPart],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && firstPart.inlineData) {
                const base64ImageBytes: string = firstPart.inlineData.data;
                const mimeType = firstPart.inlineData.mimeType;
                setGeneratedImageUrl(`data:${mimeType};base64,${base64ImageBytes}`);
            } else {
                throw new Error('No image was generated. Please try a different prompt.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred while generating the image.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="app-container">
            <header>
                <h1>AI Image Editor</h1>
                <p>Edit images with text prompts, powered by Gemini.</p>
            </header>

            <main>
                <div className="controls">
                     <div className="prompt-group">
                        <label className="file-input-wrapper" htmlFor="file-upload">
                            {imageFile ? 'Change Image' : 'Upload Image'}
                            <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} />
                        </label>
                        <input
                            type="text"
                            className="text-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your edit or select a preset..."
                            aria-label="Image edit prompt"
                        />
                        <button
                            className="generate-btn"
                            onClick={handleSubmit}
                            disabled={!imageFile || !prompt || isLoading}
                            aria-label="Generate edited image"
                        >
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                </div>

                <div className="presets-container">
                    <h3>Presets</h3>
                    <div className="presets-grid">
                        {presets.map((preset) => (
                            <button
                                key={preset.name}
                                className="preset-btn"
                                onClick={() => setPrompt(preset.prompt)}
                                title={preset.prompt}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}

                <div className="image-comparison">
                    <div className="image-container">
                        <h3>Original</h3>
                        {imageDataUrl ? (
                            <img src={imageDataUrl} alt="Original upload" />
                        ) : (
                            <p className="placeholder-text">Upload or paste an image to start</p>
                        )}
                    </div>
                    <div className="image-container">
                        <h3>Generated</h3>
                        {isLoading ? (
                            <div className="loader" role="status" aria-label="Loading"></div>
                        ) : generatedImageUrl ? (
                            <img src={generatedImageUrl} alt="Generated result" />
                        ) : (
                            <p className="placeholder-text">Your edited image will appear here</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}