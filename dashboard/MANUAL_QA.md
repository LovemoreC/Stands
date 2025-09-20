# Manual QA - Document Requirements Admin

## Environment
- Start backend (`uvicorn app.main:app --reload`).
- Start dashboard (`npm install` then `npm run dev`).

## Steps
1. Sign in as an admin user and open the **Document Requirements** page from the navigation.
2. With the "Offers" workflow selected, create a new requirement named "Signed offer". Confirm it appears at the end of the list.
3. Add a second requirement (e.g., "Proof of funds") and use the ▲/▼ controls to move it to the top. Refresh the page and verify the order persists.
4. Edit the requirement name inline (e.g., rename to "Recent proof of funds") and tab away. Confirm the change is saved and survives a refresh.
5. Delete the secondary requirement and verify that only the remaining requirement is listed.
6. Switch through each workflow to ensure the list updates independently without leaking entries from other workflows.
7. Using an agent session, attempt to submit an offer without attaching the configured requirement documents. The request should be rejected until the required document payload is supplied.

## Results
- Requirements can be created, reordered, renamed, and deleted, and their order persists after reloading the page.
- Each workflow shows only its own configured requirements.
- Submissions for a workflow with requirements are blocked until the required documents are present, confirming the configuration is enforced end-to-end.
