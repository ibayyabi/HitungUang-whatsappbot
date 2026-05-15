const { LLMService } = require('../utils/llmService');
const logger = require('../utils/logger');

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({
        getGenerativeModel: jest.fn(() => ({
            generateContent: mockGenerateContent
        }))
    }))
}));

describe('LLMService Fallback Logic', () => {
    let llmService;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-key';
        llmService = new LLMService();
    });

    test('should succeed on first try if model is available', async () => {
        mockGenerateContent.mockResolvedValue({
            response: { text: () => 'success' }
        });

        const { result, modelName } = await llmService.generateContentWithFallback('hello');

        expect(modelName).toBe('gemma-3-27b-it');
        expect(result.response.text()).toBe('success');
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    test('should fallback to second model if first one is rate limited', async () => {
        // First call fails with rate limit
        mockGenerateContent.mockRejectedValueOnce(new Error('429 Too Many Requests'));
        // Second call succeeds
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => 'success from second' }
        });

        const { result, modelName } = await llmService.generateContentWithFallback('hello');

        expect(modelName).toBe('gemma-4-26b');
        expect(result.response.text()).toBe('success from second');
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Limit reached for gemma-3-27b-it'));
    });

    test('should fallback to third model if first two are rate limited', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('429 Limit reached'));
        mockGenerateContent.mockRejectedValueOnce(new Error('Quota exceeded'));
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => 'success from third' }
        });

        const { result, modelName } = await llmService.generateContentWithFallback('hello');

        expect(modelName).toBe('gemma-4-31b');
        expect(result.response.text()).toBe('success from third');
        expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    test('should throw error if all models fail', async () => {
        mockGenerateContent.mockRejectedValue(new Error('429 Limit reached'));

        await expect(llmService.generateContentWithFallback('hello'))
            .rejects.toThrow('All LLM models failed or reached limit');
        
        expect(mockGenerateContent).toHaveBeenCalledTimes(llmService.models.length);
    });

    test('should fallback even for non-rate limit errors if configured', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('Something went wrong'));
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => 'success' }
        });

        const { result, modelName } = await llmService.generateContentWithFallback('hello');

        expect(modelName).toBe('gemma-4-26b');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('LLM Error with gemma-3-27b-it: Something went wrong'));
    });
});
