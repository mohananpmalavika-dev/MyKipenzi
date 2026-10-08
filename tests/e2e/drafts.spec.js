import { test, expect } from '@playwright/test';

test.describe('Message Drafts E2E', () => {
  test.beforeEach(async ({ page }) => {
    // This assumes you have authentication setup
    // Adjust based on your actual auth flow
    await page.goto('/');
  });

  test('should auto-save draft when typing', async ({ page }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Type a message
    const draftText = 'This is my test draft message';
    await page.fill('textarea[aria-label="Message"]', draftText);
    
    // Wait for auto-save (1 second debounce)
    await page.waitForTimeout(1500);
    
    // Switch to another conversation
    await page.click('button.conversation:nth-child(2)');
    
    // Go back to the first conversation
    await page.click('button.conversation:first-child');
    
    // Check if draft is restored
    const textareaValue = await page.inputValue('textarea[aria-label="Message"]');
    expect(textareaValue).toBe(draftText);
  });

  test('should show draft indicator in conversation list', async ({ page }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Type a message
    await page.fill('textarea[aria-label="Message"]', 'Draft indicator test');
    
    // Wait for auto-save
    await page.waitForTimeout(1500);
    
    // Navigate away (to conversations list or another chat)
    await page.click('.mobile-back');
    
    // Check for draft indicator
    const draftIndicator = page.locator('button.conversation:first-child p', {
      hasText: /📝 Draft:/
    });
    
    await expect(draftIndicator).toBeVisible();
  });

  test('should clear draft after sending message', async ({ page }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Type a message
    const messageText = 'This message will be sent';
    await page.fill('textarea[aria-label="Message"]', messageText);
    
    // Wait for auto-save
    await page.waitForTimeout(1500);
    
    // Send the message
    await page.click('button.send-btn');
    
    // Wait for send to complete
    await page.waitForTimeout(500);
    
    // Check that textarea is empty
    const textareaValue = await page.inputValue('textarea[aria-label="Message"]');
    expect(textareaValue).toBe('');
    
    // Navigate away and back
    await page.click('button.conversation:nth-child(2)');
    await page.click('button.conversation:first-child');
    
    // Draft should not be restored
    const restoredValue = await page.inputValue('textarea[aria-label="Message"]');
    expect(restoredValue).toBe('');
  });

  test('should handle multiple drafts in different conversations', async ({ page }) => {
    // First conversation
    await page.click('button.conversation:first-child');
    await page.fill('textarea[aria-label="Message"]', 'Draft 1');
    await page.waitForTimeout(1500);
    
    // Second conversation
    await page.click('button.conversation:nth-child(2)');
    await page.fill('textarea[aria-label="Message"]', 'Draft 2');
    await page.waitForTimeout(1500);
    
    // Third conversation
    await page.click('button.conversation:nth-child(3)');
    await page.fill('textarea[aria-label="Message"]', 'Draft 3');
    await page.waitForTimeout(1500);
    
    // Verify each draft is preserved
    await page.click('button.conversation:first-child');
    expect(await page.inputValue('textarea[aria-label="Message"]')).toBe('Draft 1');
    
    await page.click('button.conversation:nth-child(2)');
    expect(await page.inputValue('textarea[aria-label="Message"]')).toBe('Draft 2');
    
    await page.click('button.conversation:nth-child(3)');
    expect(await page.inputValue('textarea[aria-label="Message"]')).toBe('Draft 3');
  });

  test('should preserve draft after app reload', async ({ page, context }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Type a message
    const draftText = 'This draft survives reload';
    await page.fill('textarea[aria-label="Message"]', draftText);
    
    // Wait for auto-save
    await page.waitForTimeout(1500);
    
    // Reload the page
    await page.reload();
    
    // Wait for app to load
    await page.waitForSelector('button.conversation:first-child');
    
    // Open the same conversation
    await page.click('button.conversation:first-child');
    
    // Check if draft is restored
    const textareaValue = await page.inputValue('textarea[aria-label="Message"]');
    expect(textareaValue).toBe(draftText);
  });

  test('should show truncated draft preview for long text', async ({ page }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Type a very long message
    const longText = 'A'.repeat(100);
    await page.fill('textarea[aria-label="Message"]', longText);
    
    // Wait for auto-save
    await page.waitForTimeout(1500);
    
    // Navigate away
    await page.click('.mobile-back');
    
    // Check draft preview is truncated
    const draftPreview = await page.locator(
      'button.conversation:first-child p'
    ).textContent();
    
    expect(draftPreview).toContain('📝 Draft:');
    expect(draftPreview).toContain('...');
    expect(draftPreview.length).toBeLessThan(longText.length + 20);
  });

  test('should preserve source language in draft', async ({ page }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Select a specific source language
    await page.selectOption('select[aria-label="Source language"]', 'ml');
    
    // Type a message
    await page.fill('textarea[aria-label="Message"]', 'Malayalam message');
    
    // Wait for auto-save
    await page.waitForTimeout(1500);
    
    // Switch conversations and come back
    await page.click('button.conversation:nth-child(2)');
    await page.click('button.conversation:first-child');
    
    // Check language is preserved
    const selectedLanguage = await page.inputValue('select[aria-label="Source language"]');
    expect(selectedLanguage).toBe('ml');
  });

  test('should delete draft when textarea is cleared', async ({ page }) => {
    // Navigate to a conversation
    await page.click('button.conversation:first-child');
    
    // Type and save a draft
    await page.fill('textarea[aria-label="Message"]', 'Temporary draft');
    await page.waitForTimeout(1500);
    
    // Clear the textarea
    await page.fill('textarea[aria-label="Message"]', '');
    await page.waitForTimeout(1500);
    
    // Navigate away and back
    await page.click('button.conversation:nth-child(2)');
    await page.click('button.conversation:first-child');
    
    // Draft should not be restored
    const textareaValue = await page.inputValue('textarea[aria-label="Message"]');
    expect(textareaValue).toBe('');
  });
});
