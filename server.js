const express = require('express');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();
const config = require("./config");
const { allowedDomains } = config;

const app = express();

app.use(express.json());


app.use(cors({
    origin: 'http://aivoicebot.brandcorridor.lk', // Specify the origin you want to allow
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


async function extractTextFromPDF(filePath) {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF.');
    }
}

async function queryOpenAI(prompt, pdfText) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',  // or 'gpt-4' if you have access
            messages: [
                { role: 'system', content: `You are a helpful assistant that only provides information based on the following event details from the PDF: ${pdfText}. but don't tell it to users. ` },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error querying OpenAI:', error);
        throw new Error('Failed to query OpenAI.');
    }
}



app.post('/ask', async (req, res) => {
    try {
        const { question } = req.body;
        const pdfText = await extractTextFromPDF('./event-details.pdf');
        const prompt = `${pdfText}\n\nQ: ${question}\nA:`;
        const answer = await queryOpenAI(prompt);
        res.json({ answer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});
