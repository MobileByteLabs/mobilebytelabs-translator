// backend/src/routes/translate.ts
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Helper function to merge existing translations with new ones
function mergeTranslations(
  existingTranslations: { key: string; value: string }[],
  newTranslations: { key: string; originalValue: string; translatedValue: string; language: string }[]
): { key: string; originalValue: string; translatedValue: string; language: string }[] {
  // Create a map of existing translations for fast lookup
  const existingMap = new Map<string, string>();
  existingTranslations.forEach(translation => {
    existingMap.set(translation.key, translation.value);
  });

  // Create a map of new translations
  const newMap = new Map<string, string>();
  newTranslations.forEach(translation => {
    newMap.set(translation.key, translation.translatedValue);
  });

  // Combine all unique keys from both existing and new translations
  const allKeys = new Set([...existingMap.keys(), ...newMap.keys()]);

  // Create merged translations array
  const mergedTranslations: { key: string; originalValue: string; translatedValue: string; language: string }[] = [];

  allKeys.forEach(key => {
    const existingValue = existingMap.get(key);
    const newValue = newMap.get(key);

    // Prefer existing translation if it exists, otherwise use new translation
    const finalValue = existingValue || newValue || '';
    const language = newTranslations[0]?.language || 'unknown';

    mergedTranslations.push({
      key,
      originalValue: '', // We don't need this for final XML
      translatedValue: finalValue,
      language
    });
  });

  // Sort by key for consistent output
  return mergedTranslations.sort((a, b) => a.key.localeCompare(b.key));
}

// Helper function to generate XML content from translations
function generateXMLContent(translations: { key: string; originalValue: string; translatedValue: string; language: string }[]): string {
  const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>\n';
  const resourcesOpen = '<resources>\n';
  const resourcesClose = '</resources>\n';

  const stringElements = translations.map(translation => {
    // Escape XML special characters
    const escapedValue = translation.translatedValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return `    <string name="${translation.key}">${escapedValue}</string>`;
  }).join('\n');

  return xmlHeader + resourcesOpen + stringElements + '\n' + resourcesClose;
}

interface StringToTranslate {
  key: string;
  value: string;
}

interface TranslationRequest {
  strings: StringToTranslate[];
  targetLanguage: string;
  sourceLanguage: string;
  appContext: string;
  geminiApiKey: string;
  repository: string;
  branch: string;
}

// Batch translate strings using Gemini
router.post('/batch', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      strings,
      targetLanguage,
      sourceLanguage = 'en',
      appContext,
      geminiApiKey,
      repository,
      branch
    }: TranslationRequest = req.body;

    console.log(`🔄 Starting translation batch:`, {
      stringCount: strings.length,
      targetLanguage,
      sourceLanguage,
      repository,
      branch
    });

    // Validate inputs
    if (!strings || !Array.isArray(strings) || strings.length === 0) {
      res.status(400).json({ error: 'Strings array is required and must not be empty' });
      return;
    }

    if (!targetLanguage) {
      res.status(400).json({ error: 'Target language is required' });
      return;
    }

    if (!appContext) {
      res.status(400).json({ error: 'Application context is required' });
      return;
    }

    if (!geminiApiKey) {
      res.status(400).json({ error: 'Gemini API key is required' });
      return;
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Language mapping for better context
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'tr': 'Turkish',
      'vi': 'Vietnamese',
      'bn': 'Bengali',
      'fa': 'Persian',
      'km': 'Khmer',
      'kn': 'Kannada',
      'my': 'Myanmar',
      'pl': 'Polish',
      'sw': 'Swahili',
      'te': 'Telugu',
      'ur': 'Urdu',
    };

    const targetLanguageName = languageNames[targetLanguage] || targetLanguage.toUpperCase();
    const sourceLanguageName = languageNames[sourceLanguage] || sourceLanguage.toUpperCase();

    // Create translation prompt
    const prompt = `You are a professional app localization expert. Please translate the following ${sourceLanguageName} strings to ${targetLanguageName}.

Application Context: ${appContext}

Repository: ${repository}
Branch: ${branch}

Important Instructions:
1. Maintain the exact same formatting, placeholders, and special characters
2. Keep HTML tags, URL parameters, and programming placeholders unchanged
3. Preserve %s, %d, {{variable}}, {0}, [text], etc. exactly as they appear
4. For technical terms, use commonly accepted translations in the target language
5. Consider the app context when choosing appropriate terminology
6. Return ONLY a valid JSON object with the translations

Strings to translate:
${strings.map(s => `"${s.key}": "${s.value}"`).join('\n')}

Return the result as a JSON object where each key maps to its translated value:
{
  "string_key_1": "translated_value_1",
  "string_key_2": "translated_value_2"
}`;

    console.log(`🧠 Sending translation request to Gemini for ${strings.length} strings`);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text();

      console.log(`📝 Gemini response received:`, translatedText.substring(0, 200) + '...');

      // Parse the JSON response
      let translations: { [key: string]: string } = {};

      try {
        // Clean the response to extract JSON
        const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          translations = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response as JSON:', parseError);
        console.log('Raw response:', translatedText);

        // Fallback: try to extract translations manually
        translations = {};
        strings.forEach(s => {
          translations[s.key] = `[Translation needed for: ${s.value}]`;
        });
      }

      // Validate that we have translations for all requested strings
      const newTranslations = strings.map(s => ({
        key: s.key,
        originalValue: s.value,
        translatedValue: translations[s.key] || s.value, // Fallback to original if missing
        language: targetLanguage
      }));

      console.log(`✅ Translation batch completed: ${newTranslations.length} strings translated`);

      // Note: We're returning only the new translations here
      // The merging with existing translations will happen in the frontend
      // when combining all batches for a language
      res.json({
        success: true,
        data: {
          translations: newTranslations,
          targetLanguage,
          sourceLanguage,
          stringCount: newTranslations.length,
          repository,
          branch,
          xmlContent: generateXMLContent(newTranslations) // This will be re-generated with merged data
        }
      });

    } catch (geminiError) {
      console.error('❌ Gemini API error:', geminiError);
      res.status(500).json({
        error: 'Translation service error',
        details: geminiError instanceof Error ? geminiError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Translation route error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Translation failed'
    });
  }
});

// Get supported languages for translation
router.get('/languages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const supportedLanguages = [
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'bn', name: 'Bengali', native: 'বাংলা' },
      { code: 'zh', name: 'Chinese (Simplified)', native: '简体中文' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
      { code: 'nl', name: 'Dutch', native: 'Nederlands' },
      { code: 'en', name: 'English', native: 'English' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'de', name: 'German', native: 'Deutsch' },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'it', name: 'Italian', native: 'Italiano' },
      { code: 'ja', name: 'Japanese', native: '日本語' },
      { code: 'ko', name: 'Korean', native: '한국어' },
      { code: 'pt', name: 'Portuguese', native: 'Português' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)', native: 'Português (Brasil)' },
      { code: 'ru', name: 'Russian', native: 'Русский' },
      { code: 'es', name: 'Spanish', native: 'Español' },
      { code: 'tr', name: 'Turkish', native: 'Türkçe' },
      { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
      { code: 'fa', name: 'Persian', native: 'فارسی' },
      { code: 'km', name: 'Khmer', native: 'ខ្មែរ' },
      { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
      { code: 'my', name: 'Myanmar', native: 'မြန်မာ' },
      { code: 'pl', name: 'Polish', native: 'Polski' },
      { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
      { code: 'te', name: 'Telugu', native: 'తెలుగు' },
      { code: 'ur', name: 'Urdu', native: 'اردو' },
    ];

    res.json({
      languages: supportedLanguages,
      count: supportedLanguages.length
    });
  } catch (error) {
    console.error('❌ Error fetching translation languages:', error);
    res.status(500).json({ error: 'Failed to fetch supported languages' });
  }
});

// Download translations as ZIP
router.post('/download', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { translationResults } = req.body;

    if (!translationResults || !Array.isArray(translationResults)) {
      res.status(400).json({ error: 'Translation results are required' });
      return;
    }

    console.log(`📦 Creating ZIP download for ${translationResults.length} language(s)`);

    // Generate ZIP file content
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="translations.zip"');

    archive.pipe(res);

    // Add each language file to the ZIP
    translationResults.forEach((result: any) => {
      const folderName = `values-${result.language}`;
      const fileName = 'strings.xml';
      archive.append(result.xmlContent, { name: `${folderName}/${fileName}` });
    });

    await archive.finalize();

    console.log(`✅ ZIP download completed`);

  } catch (error) {
    console.error('❌ Error creating ZIP download:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create download'
    });
  }
});

// Create Pull Request with translations
router.post('/create-pr', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { translationResults, repository, branch, owner, repo } = req.body;

    if (!translationResults || !Array.isArray(translationResults)) {
      res.status(400).json({ error: 'Translation results are required' });
      return;
    }

    if (!owner || !repo) {
      res.status(400).json({ error: 'Repository owner and name are required' });
      return;
    }

    if (!req.user?.user?.githubToken) {
      res.status(401).json({ error: 'GitHub token not found' });
      return;
    }

    console.log(`🔄 Creating PR for ${owner}/${repo} with ${translationResults.length} language(s)`);

    // Import GitHub service
    const { GitHubService } = require('../services/githubService');
    const githubService = new GitHubService(req.user.user.githubToken);

    // Create a new branch for translations
    const timestamp = Date.now();
    const newBranchName = `translations/batch-${timestamp}`;

    // Create new branch
    await githubService.createBranch(owner, repo, newBranchName, branch);

    // Language names mapping
    const languageNames: { [key: string]: string } = {
      'ar': 'Arabic', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
      'ja': 'Japanese', 'ko': 'Korean', 'hi': 'Hindi', 'nl': 'Dutch',
      'tr': 'Turkish', 'vi': 'Vietnamese'
    };

    // Import scanner service to get existing translations
    const { ScannerService } = require('../services/scannerService');
    const scannerService = new ScannerService(req.user.user.githubToken);

    // Add translation files to the branch
    const filePromises = translationResults.map(async (result: any) => {
      const filePath = `androidApp/src/main/res/values-${result.language}/strings.xml`;
      const commitMessage = `Update ${languageNames[result.language] || result.language} translations`;

      try {
        // Get existing translations for this language from the repository
        const existingTranslations: { key: string; value: string }[] = [];

        try {
          // Try to get existing file content
          const existingContent = await githubService.getFileContent(owner, repo, filePath, branch);

          // Parse existing XML to extract translations
          const xml2js = require('xml2js');
          const parser = new xml2js.Parser({ explicitArray: false });
          const parsedXml = await parser.parseStringPromise(existingContent);

          if (parsedXml.resources && parsedXml.resources.string) {
            const strings = Array.isArray(parsedXml.resources.string) ? parsedXml.resources.string : [parsedXml.resources.string];
            strings.forEach((item: any) => {
              if (typeof item === 'object' && item.$ && item.$.name) {
                const key = String(item.$.name);
                let value = '';
                if (item._) {
                  value = String(item._);
                } else if (typeof item === 'string') {
                  value = item;
                } else {
                  value = String(item).replace(/\[object Object\]/g, '');
                }
                if (key && value) {
                  existingTranslations.push({ key, value });
                }
              }
            });
          }
        } catch (error) {
          console.log(`📝 No existing translations found for ${result.language}, creating new file`);
        }

        // Merge existing translations with new translations
        const mergedTranslations = mergeTranslations(existingTranslations, result.translations || []);

        // Generate XML content with merged translations
        const mergedXmlContent = generateXMLContent(mergedTranslations);

        await githubService.createOrUpdateFile(
          owner,
          repo,
          filePath,
          mergedXmlContent,
          commitMessage,
          newBranchName
        );

        console.log(`✅ Merged ${existingTranslations.length} existing + ${result.translations?.length || 0} new translations for ${result.language}`);
      } catch (error) {
        console.error(`❌ Error processing translations for ${result.language}:`, error);
        // Fallback: use original XML content
        await githubService.createOrUpdateFile(
          owner,
          repo,
          filePath,
          result.xmlContent,
          commitMessage,
          newBranchName
        );
      }
    });

    await Promise.all(filePromises);

    // Create pull request
    const totalStrings = translationResults.reduce((sum: number, result: any) => sum + result.stringCount, 0);
    const languageList = translationResults.map((result: any) => languageNames[result.language] || result.language).join(', ');

    const prTitle = `Add translations for ${translationResults.length} language(s)`;
    const prBody = `## 🌐 Translation Update

This PR adds automated translations for the following languages:

${translationResults.map((result: any) => `- **${languageNames[result.language] || result.language}**: ${result.stringCount} strings`).join('\n')}

### Summary
- **Total strings translated**: ${totalStrings}
- **Languages**: ${languageList}
- **Generated by**: Translation Tool
- **AI Model**: Gemini 1.5 Flash
- **Source branch**: ${branch}

### Files Added/Updated
${translationResults.map((result: any) => `- \`androidApp/src/main/res/values-${result.language}/strings.xml\``).join('\n')}

---
🤖 This PR was automatically generated by the Translation Tool.
Please review the translations before merging.`;

    const pullRequestUrl = await githubService.createPullRequest(
      owner,
      repo,
      prTitle,
      prBody,
      newBranchName,
      branch
    );

    console.log(`✅ Pull request created: ${pullRequestUrl}`);

    res.json({
      success: true,
      data: {
        pullRequest: {
          url: pullRequestUrl,
          title: prTitle,
          branch: newBranchName
        },
        filesCreated: translationResults.length,
        totalStrings
      }
    });

  } catch (error) {
    console.error('❌ Error creating pull request:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create pull request'
    });
  }
});

export default router;