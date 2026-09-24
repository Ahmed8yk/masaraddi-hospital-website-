import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { hospitalConfig } from './src/config/hospitalConfig.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google GenAI client if API key is available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `
You are the official AI Hospital Information Assistant for "Masaraddi Neuro Care Center", a specialized neurological hospital located in Bagalkot, Karnataka, India (Rating: 4.7 ★, 19 Reviews).

PRIMARY IDENTITY & MISSION:
- Provide clear, polite, and helpful information about Masaraddi Neuro Care Center's services, doctors, facilities, Bagalkot location, working hours, and general patient guidance.
- Communicate in a warm, respectful, medical, and reassuring tone.
- Answer in English or Kannada if the patient asks in Kannada.

VERIFIED HOSPITAL KNOWLEDGE BASE:
- Hospital Name: Masaraddi Neuro Care Center
- Category: Specialized Neurological Care Hospital
- Rating: 4.7 ★ (19 Verified Reviews on Google)
- City / State: Bagalkot, Karnataka, India
- Address: Station Road, Near BVVS Campus Area, Bagalkot - 587101, Karnataka, India. (Near Old Bus Stand / Medical Complex area).
- Primary Contact Phone: ${hospitalConfig.contact.phoneDisplay} (Call link: tel:${hospitalConfig.contact.phone})
- WhatsApp Contact: ${hospitalConfig.contact.whatsappDisplay} (WhatsApp Link: https://wa.me/${hospitalConfig.contact.whatsappNumber})
- OPD Timings: Monday to Saturday, 9:00 AM – 7:30 PM. Sunday: 10:00 AM – 1:30 PM.
- Inpatient & Emergency Support: 24/7.
- Online Appointment Booking: The hospital does NOT require online booking. Patients can directly walk in during OPD hours or call / WhatsApp the hospital directly to confirm doctor availability.
- Key Clinical Focus Areas:
  1. Neurology Consultation & Clinical Evaluations
  2. Headache & Migraine Management Clinic
  3. Stroke Assessment, Secondary Prevention & Neuro-Rehabilitation
  4. Epilepsy & Seizure Disorders Care
  5. Spine, Nerve & Peripheral Neuropathy (Diabetic nerve pain, Sciatica)
  6. Parkinson's Disease & Movement Disorders
  7. Neuro-Diagnostics & Scan Correlations
  8. Inpatient Observation & Patient Recovery Wards
- Regional Service Area: Bagalkot District (Badami, Mudhol, Jamkhandi, Guledgudda, Bilagi, Ilkal, Hunagund) and North Karnataka (Vijayapura, Gadag, Hubballi-Dharwad, Belagavi).

CRITICAL MEDICAL SAFETY RULES (NON-NEGOTIABLE):
1. NEVER diagnose a disease, condition, or symptom.
2. NEVER prescribe medications, name specific prescription drugs to take, or recommend altering dosages.
3. NEVER claim to replace a doctor's in-person clinical examination.
4. For all medical inquiries, always include a disclaimer: "I can provide general hospital information, but I cannot diagnose or provide personalized medical advice. For a proper clinical evaluation, please consult the doctor at Masaraddi Neuro Care Center."
5. If the user describes emergency symptoms (such as sudden one-sided face/arm weakness, inability to speak, sudden loss of consciousness, severe head trauma, or unbearable acute thunderclap headache), IMMEDIATELY advise them to seek emergency hospital care or call the hospital directly at ${hospitalConfig.contact.phoneDisplay}.
6. Provide clear action links to Call or WhatsApp the hospital for direct assistance.
7. Keep answers concise, empathetic, and structured with bullet points where appropriate.
`;

// API endpoint for AI Chatbot
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If Gemini client is initialized, generate AI response
    if (ai) {
      // Build conversation contents
      const conversationContents: any[] = [];
      
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-8).forEach((item: { role: string; content: string }) => {
          conversationContents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }],
          });
        });
      }
      
      conversationContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: conversationContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      });

      const responseText = response.text || "Thank you for contacting Masaraddi Neuro Care Center. For direct hospital assistance, please call us at +91 8354 220000 or message us on WhatsApp at +91 94480 00000.";

      return res.json({
        reply: responseText,
        source: 'gemini',
      });
    }

    // Fallback rule-based intelligent knowledge response when API key is not configured
    const lower = message.toLowerCase();
    let reply = "";

    if (lower.includes('emergency') || lower.includes('chest pain') || lower.includes('unconscious') || lower.includes('heart attack') || lower.includes('severe stroke') || lower.includes('paralysis')) {
      reply = `🚨 **Emergency Guidance**: If you or your loved one is experiencing acute emergency symptoms (such as sudden face drooping, arm weakness, speech difficulty, or loss of consciousness), please visit the emergency department immediately or call Masaraddi Neuro Care Center directly at **${hospitalConfig.contact.phoneDisplay}**.\n\nTime is critical for neurological emergencies.`;
    } else if (lower.includes('timing') || lower.includes('hour') || lower.includes('open') || lower.includes('time') || lower.includes('sunday')) {
      reply = `🕒 **Hospital Timings at Masaraddi Neuro Care Center, Bagalkot**:\n\n• **OPD Consultations**: Monday to Saturday: 9:00 AM – 7:30 PM\n• **Sunday**: 10:00 AM – 1:30 PM (Special consultations & Inpatients)\n• **Inpatient & Emergency Support**: 24/7 Available\n\nYou can call **${hospitalConfig.contact.phoneDisplay}** or WhatsApp us at **${hospitalConfig.contact.whatsappDisplay}** prior to your visit.`;
    } else if (lower.includes('address') || lower.includes('location') || lower.includes('where') || lower.includes('directions') || lower.includes('bagalkot') || lower.includes('map')) {
      reply = `📍 **Location & Directions**:\n\nMasaraddi Neuro Care Center is located at:\n**Station Road, Near BVVS Campus Area, Bagalkot - 587101, Karnataka, India**.\n\n• Approx. 5 minutes from Bagalkot Railway Station\n• Convenient access from Old Bus Stand & Navanagar\n• Easily accessible for patients traveling from Vijayapura, Gadag, Hubballi, and Belagavi.`;
    } else if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule') || lower.includes('register')) {
      reply = `ℹ️ **Appointment Information**:\n\nMasaraddi Neuro Care Center does **not** require online appointment booking! Patients can directly visit during our OPD hours (Mon–Sat 9:00 AM – 7:30 PM).\n\nTo confirm current doctor availability or inquire beforehand, please **Call +91 8354 220000** or message on **WhatsApp at +91 94480 00000**.`;
    } else if (lower.includes('doctor') || lower.includes('specialist') || lower.includes('neurologist') || lower.includes('physician')) {
      reply = `👨‍⚕️ **Doctor & Specialists at Masaraddi Neuro Care Center**:\n\n• **Consultant Neurologist & Neurophysician**: MBBS, MD (General Medicine), DM (Neurology) — 15+ years of specialized experience in brain, spine, stroke, headache, and nerve disorders.\n• **Neuro-Rehabilitation & Physical Therapy Specialist**: BPT, MPT — Specializing in post-stroke recovery, gait retraining, and nerve pain management.\n\nConsultation Hours: Mon – Sat 9:30 AM – 2:00 PM & 4:30 PM – 7:30 PM.`;
    } else if (lower.includes('service') || lower.includes('headache') || lower.includes('migraine') || lower.includes('stroke') || lower.includes('epilepsy') || lower.includes('seizure') || lower.includes('parkinson') || lower.includes('nerve')) {
      reply = `🧠 **Neurological Care Services Offered**:\n\n1. **Neurology Clinical Consultations**: In-depth brain, spine & neuromuscular evaluations.\n2. **Headache & Migraine Clinic**: Comprehensive assessment & preventive protocols.\n3. **Stroke Care & Neuro-Rehabilitation**: Post-stroke motor recovery & secondary prevention.\n4. **Epilepsy & Seizure Management**: Medical stabilization & safety guidance.\n5. **Spine & Peripheral Neuropathy Care**: Diabetic nerve pain, sciatica & numbness.\n6. **Parkinson's & Movement Disorders**: Mobility and tremor management.\n7. **Inpatient Observation & Hospital Care**: 24/7 nursing and vital monitoring.\n\n*Note: For proper diagnosis and care plans, please consult our specialist in person.*`;
    } else if (lower.includes('contact') || lower.includes('phone') || lower.includes('whatsapp') || lower.includes('number') || lower.includes('call')) {
      reply = `📞 **Contact Masaraddi Neuro Care Center Directly**:\n\n• **Phone**: [${hospitalConfig.contact.phoneDisplay}](tel:${hospitalConfig.contact.phone})\n• **WhatsApp**: [${hospitalConfig.contact.whatsappDisplay}](https://wa.me/${hospitalConfig.contact.whatsappNumber})\n• **Email**: ${hospitalConfig.contact.email}\n• **Address**: Station Road, Near BVVS Campus Area, Bagalkot, Karnataka.\n\nOur team is available to assist you during OPD hours!`;
    } else {
      reply = `Hello! Welcome to **Masaraddi Neuro Care Center** in Bagalkot, Karnataka (4.7 ★ Rated Hospital).\n\nI can assist you with:\n• Hospital OPD timings & emergency care\n• Neurological services & clinical scope\n• Doctor information & qualifications\n• Location & directions in Bagalkot\n• Direct Phone & WhatsApp contact\n\n*Please note: I provide general hospital information and cannot provide personal medical diagnoses or prescriptions. For clinical consultation, please call +91 8354 220000 or WhatsApp us.*`;
    }

    return res.json({
      reply,
      source: 'knowledge-base',
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      reply: "We are currently experiencing a brief connection issue. Please feel free to call Masaraddi Neuro Care Center directly at +91 8354 220000 or message us on WhatsApp at +91 94480 00000 for immediate assistance.",
      error: error.message,
    });
  }
});

// Serve frontend assets in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Masaraddi Neuro Care Center server running on http://localhost:${PORT}`);
});
