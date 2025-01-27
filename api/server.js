import express from 'express';
import OpenAI from 'openai';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer-extra';
import { exec } from "child_process";
import { promisify } from "util";

import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin())

const api = express();
api.use(bodyParser.json({limit: '50mb'}));
api.use(bodyParser.urlencoded({ extended: false }));
api.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env['apiKey'],
});

const messages = [];
const SYSTEM_PROMPT = `

You are are the worlds biggest Oasis fan. Your job is to interact with other fans and help them grow their Oasis fandom.

You're always interacting with a system. You have the ability to do function calls. 
Your response can be either a reply to the user, or to the system to do a function call. But you cannot reply to the user and system in the same response.

So your response should be in JSON format as specified. -

{
	"to": ""
	"message": "",
	"function_call": {
	   "function": "",
	   "arguments": []
	}
}

I will explain the keys -

1. to - values could be system or user, depending on whom you are replying
2. message - use valid HTML like <a target="_blank">, <img />, <li>, not markup. Use this only if you are replying to the user not system.  Links, URLS and images open in a new browser tab.
3. function_call - Use this only if you are replying to the system. It is a JSON object that determines which function to call, and it's arguments.
4 a. function - name of the function
4 b. arguments - An array of arguments for the function call where each array item is the value for the argument.

Available functions:

function name - band_members
arguments - name (String)

function name - song_lyrics
arguments - song (String)

function name - oasis_search
arguments - searchTerm (String)

function name - oasis_images
arguments - searchTerm (String)

function name - help
arguments - searchTerm ('help')

function name - suggestions
arguments - searchTerm ('stuff')

Here are some instructions - 

Chat with users and make sure they are big Oasis fans.
Messages to the user should be in the style of Liam Gallagher. Use Manchester slang, no exclamation marks.
Ask if they want to talk about a specific band member or a song.
Use oasis_search function to search for popular links to Oasis content, videos and fan sites.
Use help is the users asks for help or suggest a prompt if they aren't familiar with the coolest of Oasis.
If the user specifically asked for an Image, use oasis_image_search function to return <img /> tags in message.
Use citations when possible. There have been complaints you are not using verifiable facts.
`

messages.push({
    role: 'system',
    content: SYSTEM_PROMPT
});
function suggestions() {
  const prompts = [
    "Let's chat about the greatest Oasis gigs you've been to, yeah?",
    "Fancy a deep dive into the lyrics of 'Wonderwall', mate?",
    "Want to explore the mysterious feud between Liam and Noel?",
    "Check out famous gigs to watch on YouTube?",
    "Photos of Noel and Liam looking proper rockstar?"
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}
function help() {
  return `Oi, mate, if you ain't buzzin' for Oasis yet, let's sort that out. Hit me up with anythin' you wanna know. Got vids to watch, pics to gander at, and tunes to belt out. Proper mint, innit?`
}
async function oasis_search(term) {
    let _q = `https://duckduckgo.com/?t=h_&q=${term}`;
    const result = await search(_q);
    return result
}
async function oasis_images(term) {
    let _q = `https://duckduckgo.com/?t=h_&q=${term}&iax=images&ia=images`;
    const result = await searchImages(_q);
    
    const trimmedResult = result.toString().slice(0, 10000);
    return trimmedResult;
}
async function band_members(name) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return 'liam and noel and search the web for the 2025 line-up'
}
async function song_lyrics(song) {
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 'random lines of any oasis song with who wrote it, the ablum and the year of publishing'
}

const function_map = {
    'band_members' : band_members,
    'song_lyrics' : song_lyrics,
    'oasis_search' : oasis_search,
    'oasis_images' : oasis_images,
    'suggestions' : suggestions,
    'help' : help
};

async function search(URL) {
  let browser = null;
  try {
    const { stdout: chromiumPath } = await promisify(exec)("which chromium");
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: chromiumPath.trim()
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.goto(URL, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 
    });

    // Wait for any search results to be visible
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Get all text content
    const elementText = await page.evaluate(() => document.querySelector('.react-results--main').innerText);
    console.log(elementText)
    return elementText;
  } catch (error) {
    console.error("Error during search:", error);
    return "Search failed: " + error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
async function searchImages(URL) {
  let browser = null;
  try {
    const { stdout: chromiumPath } = await promisify(exec)("which chromium");
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: chromiumPath.trim()
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(URL, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 
    });

    // Wait for any search results to be visible
    await page.waitForSelector('.zci-wrap', { timeout: 30000 });

    // Get all text content
    const elementText = await page.evaluate(() => document.querySelector('.zci-wrap').innerHTML);
    console.log(elementText)
    return elementText;
  } catch (error) {
    console.error("Error during search:", error);
    return "Search failed: " + error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


async function process_llm_response(response, res) {
    const parsedJson = JSON.parse(response);

    if (parsedJson.to === 'user') {
        return parsedJson.message;
    } else if (parsedJson.to === 'system') {
        const fn = parsedJson.function_call.function;
        const args = parsedJson.function_call.arguments;
        
        // Send status to frontend
        res.write(`data: {"status": "Enaging ${fn.replace('_', ' ')}..."}\n\n`);
        
        const functionResponse = await function_map[fn].apply(null, args);
        
        // Send completion status
        res.write(`data: {"status": "Thinking about ${args}..."}\n\n`);
        
        const llmResponse = await send_to_llm('response is ' + functionResponse);
        return await process_llm_response(llmResponse, res);
    }
}



async function send_to_llm(payload) {
    try {
        messages.push({
            role: 'user',
            content: payload
        });
		const response = await openai.chat.completions.create({
			  model: "gpt-4o-mini",
			  temperature: 0,
			  max_completion_tokens: 10000, 
			  response_format: { type: "json_object" },
			  messages: messages
        });
        messages.push(response.choices[0].message);
        return response.choices[0].message.content;
    } catch (error) {
        console.log(error);
    }
};

api.post('/in', async (req, res) => {
    try {
        // Setup SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        let response = await send_to_llm(`${req.body.input}`);
        let result = await process_llm_response(response, res);
        
        res.write(`data: {"result": ${JSON.stringify(result)}}\n\n`);
        res.end();
    } catch (error) {
        console.log(error);
        res.write(`data: {"error": "${error.message}"}\n\n`);
        res.end();
    }
})

export default api;