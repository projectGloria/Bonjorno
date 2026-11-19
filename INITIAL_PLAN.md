# Build a Custom New Tab Extension for Brave Browser

I want you to design and develop a fully functional, polished, and customizable **New Tab Page extension for the Brave browser**.

The goal is to replace Brave's default new tab page with a modern, useful, visually refined dashboard that gives users control over their browsing environment.

Do not treat this as a simple static homepage. Build it as a proper browser extension, with a well-structured codebase, persistent settings, working interactions, and a carefully designed user experience.

## 1. Initial Assessment and Planning

Before implementation:

1. Inspect the existing project, if one is provided.
2. Identify the most suitable architecture and technology stack.
3. Verify compatibility with Brave and its Chromium-based extension APIs.
4. Determine the required permissions and explain why each one is necessary.
5. Establish a clear implementation plan, including the main components and their responsibilities.

Avoid unnecessary dependencies and overengineering. Prioritize maintainability, performance, and simplicity.

## 2. Core Extension Requirements

The extension must:

- Replace the default New Tab page in Brave.
- Use **Manifest V3** and the appropriate Chromium extension APIs.
- Work reliably in Brave, including when loaded as an unpacked extension.
- Function without requiring an account, backend, or subscription.
- Persist user preferences between browser sessions.
- Handle missing permissions, unavailable data, and unexpected errors gracefully.
- Avoid interfering with normal browser functionality.

The extension should be self-contained wherever practical. Do not introduce a backend or external service dependency unless a feature genuinely requires one.

## 3. Main Dashboard

Create a dashboard that is useful without feeling cluttered.

Consider the following components:

### Clock and Date
- Display the current time prominently.
- Support both 12-hour and 24-hour formats.
- Display the current date.
- Update the clock automatically without requiring a page refresh.
- Allow users to configure the time and date format.

### Greeting
- Display a greeting based on the current time of day.
- Allow the user to customize or disable the greeting.
- Keep the greeting subtle rather than making it the dominant element.

### Search
- Include a prominent, functional search field.
- Allow users to select their preferred search engine.
- Include Brave Search as an available option.
- Support keyboard interaction, including Enter to search and Escape to clear or dismiss suggestions where applicable.
- Ensure search submissions use the correct search URL and encode queries safely.

### Quick Links
- Let users add, edit, delete, and rearrange website shortcuts.
- Support custom names and URLs.
- Display favicons where available, with a sensible fallback.
- Allow users to choose between different shortcut layouts.
- Provide an intuitive way to manage frequently visited websites.

### Bookmarks
- Consider integrating Brave bookmarks through the appropriate extension API.
- Allow users to access bookmark folders and individual bookmarks.
- Request bookmark permissions only when this functionality is enabled.
- Handle empty bookmark collections and permission denial gracefully.

## 4. Customization

Customization should be one of the extension's defining features.

Provide a dedicated settings interface where users can configure:

**Appearance**
- Light, dark, and system themes.
- Custom accent colors.
- Background colors and gradients.
- Custom background images.
- Background image positioning and scaling.
- Adjustable interface transparency where appropriate.

**Layout**
- Show or hide individual dashboard components.
- Reposition supported components.
- Adjust spacing and density.
- Configure shortcut layouts.
- Choose between available clock and greeting styles.

**Behavior**
- Configure the default search engine.
- Choose whether the search field receives focus when opening a new tab.
- Configure time and date formats.
- Control optional animations and transitions.

Settings must persist after restarting the browser.

## 5. Optional Features

Evaluate these features and implement them only when they can be delivered reliably without compromising the core experience:

- Weather information with explicit user consent and a clearly explained external data source.
- A minimal to-do list.
- A notes widget with persistent local storage.
- Recently visited websites.
- Custom background image collections.
- Search suggestions.
- Import and export of user settings.
- Reset-to-default functionality.

Do not create artificial functionality or decorative controls that do nothing. Every implemented feature must work.

## 6. Visual Design and User Experience

The interface should feel like a professionally designed desktop application rather than a typical browser extension.

Design principles:

- Minimalist, modern, and visually refined.
- Strong visual hierarchy.
- Consistent spacing, alignment, and typography.
- Carefully balanced proportions.
- Smooth, subtle animations.
- Clean iconography.
- Consistent component styling.
- Responsive behavior across different screen sizes.
- No unnecessary visual clutter.
- No excessive borders, shadows, gradients, or decorative elements.

Pay particular attention to the dashboard's composition. The clock, search field, shortcuts, and optional widgets should feel like parts of one cohesive interface.

The extension should look polished at common desktop resolutions, including 1920×1080 and 2560×1440.

Include appropriate hover, focus, active, loading, empty, and error states.

Animations must be subtle and should respect the user's reduced-motion preference.

## 7. Settings Experience

Settings should be accessible without cluttering the main dashboard.

Create a well-organized settings interface with clearly separated sections.

Requirements:

- Changes should be reflected immediately where practical.
- Settings should be saved automatically.
- Include clear defaults and sensible configuration options.
- Provide confirmation before destructive actions.
- Include a reset option.
- Include import/export functionality if implemented.

The settings interface must be as carefully designed as the dashboard itself.

## 8. Technical Architecture

Follow modern browser-extension development practices.

Requirements:

- Use Manifest V3.
- Use `chrome_url_overrides` to replace the New Tab page.
- Use `chrome.storage.local` for persistent settings and local user data where appropriate.
- Use `chrome.bookmarks` only if bookmark integration is implemented and permission is requested.
- Keep extension permissions minimal.
- Separate UI components, application logic, settings management, and browser API integrations.
- Avoid unnecessary global state.
- Avoid duplicated logic and oversized components.
- Use reusable components where they provide genuine value.
- Ensure browser API interactions are isolated and handled safely.
- Keep the extension compatible with Brave's Chromium extension environment.

Choose a suitable frontend stack based on the project's needs. If using React, keep the implementation lightweight and avoid unnecessary dependencies.

Do not introduce libraries simply because they are popular.

## 9. Performance and Privacy

Performance and privacy are non-negotiable.

**Performance**
- The New Tab page should load quickly.
- Avoid unnecessary network requests.
- Avoid expensive rendering operations.
- Optimize background images and other assets.
- Prevent unnecessary component re-renders.
- Do not introduce memory leaks or unmanaged event listeners.
- Keep the extension lightweight.

**Privacy**
- Store user preferences and personal data locally by default.
- Do not collect analytics or telemetry.
- Do not include advertising.
- Do not transmit browsing history or personal information to external services.
- Do not request permissions without a clear feature-related reason.
- Clearly disclose external services used by optional features.
- Do not embed unnecessary third-party scripts or trackers.

The extension should remain useful even when optional external services are unavailable.

## 10. Error Handling and Edge Cases

Account for real-world scenarios:

- Missing or inaccessible favicons.
- Invalid shortcut URLs.
- Empty bookmark collections.
- Denied extension permissions.
- Corrupted or missing stored settings.
- Unsupported imported configuration files.
- Missing background images.
- Failed external requests.
- Browser restarts and extension updates.
- Different screen dimensions and scaling settings.

The extension must fail gracefully rather than leaving the dashboard broken.

## 11. Testing and Quality Assurance

Do not consider the project complete merely because the interface renders.

Test the actual extension in Brave.

Verify:

- The New Tab override works.
- The extension can be loaded through Brave's extension management page.
- All implemented interactions work.
- User settings persist after closing and reopening the browser.
- Quick links can be managed correctly.
- Search works with every supported search engine.
- Optional permissions are requested appropriately.
- Import and export work correctly, if implemented.
- No unexpected console errors occur.
- The layout behaves correctly at different resolutions.
- The extension does not interfere with normal browsing.

Fix identified issues rather than documenting them as acceptable limitations.

## 12. Project Deliverables

Provide:

1. The complete extension source code.
2. A clean and understandable project structure.
3. A valid Manifest V3 configuration.
4. All necessary assets and icons.
5. Instructions for installing the extension in Brave.
6. Instructions for building and packaging the extension.
7. A README documenting features, configuration, permissions, and installation.
8. A packaged ZIP containing the installable extension files, if the environment supports creating it.

The final extension must be installable locally without relying on a development server.

## 13. Implementation Standards

Work as a senior frontend developer and browser-extension engineer.

Do not sacrifice code quality for speed.

Do not use mock data to simulate functionality that should work with actual browser APIs.

Do not leave unfinished sections, placeholder buttons, dead controls, or TODO comments for core features.

Do not silently ignore technical limitations. Explain them and implement the best practical alternative.

Before considering the project finished, review the entire implementation for:

- Functional correctness.
- UI consistency.
- Accessibility.
- Performance.
- Privacy.
- Maintainability.
- Brave compatibility.

**Final objective:** Deliver a polished, lightweight, reliable, and genuinely useful Brave New Tab extension that feels like a thoughtfully designed desktop application, not just another browser homepage.