document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: basit HTML escape (XSS önleme)
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select options to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participantsArray = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participantsArray.length;

        // Build participants HTML (each participant has a delete icon)
        let participantsHTML = `<div class="participants-section"><h5>Participants</h5>`;
        if (participantsArray.length > 0) {
          participantsHTML += `<ul class="participants-list">`;
          participantsHTML += participantsArray
            .map(
              (p) =>
                `<li class="participant-item"><span class="participant-email">${escapeHtml(
                  p
                )}</span><button class="participant-delete" data-email="${escapeHtml(
                  p
                )}" title="Unregister">✖</button></li>`
            )
            .join("");
          participantsHTML += `</ul>`;
        } else {
          participantsHTML += `<ul class="participants-list"><li class="no-participants">No participants yet</li></ul>`;
        }
        participantsHTML += `</div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Delegate delete clicks from this activity card
        activityCard.addEventListener("click", async (ev) => {
          const btn = ev.target.closest(".participant-delete");
          if (!btn) return;

          const emailToRemove = btn.dataset.email;
          if (!emailToRemove) return;

          // Confirm removal
          const ok = confirm(`Remove ${emailToRemove} from ${name}?`);
          if (!ok) return;

          try {
            const resp = await fetch(
              `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(
                emailToRemove
              )}`,
              { method: "DELETE" }
            );

            const resJson = await resp.json().catch(() => ({}));

            if (resp.ok) {
              messageDiv.textContent = resJson.message || "Removed participant";
              messageDiv.className = "success";
              messageDiv.classList.remove("hidden");
              // refresh list
              fetchActivities();
            } else {
              messageDiv.textContent = resJson.detail || "Failed to remove participant";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }

            setTimeout(() => messageDiv.classList.add("hidden"), 4000);
          } catch (err) {
            console.error("Error removing participant:", err);
            messageDiv.textContent = "Failed to remove participant. Try again.";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        // Yeniden yükle, böylece yeni katılımcı listede gözükür
        console.log("Signup success, refreshing activities...", { activity, email });
        await fetchActivities();
        // reset form after refresh so the selected value isn't lost mid-refresh
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
