<div>
    <p>
      The setup for the study
      <strong>{{studyTitle}}</strong>
      is now complete.
      {{#if setupCompletedAt}}
        Finalized on <strong>{{setupCompletedAt}}</strong>.
      {{/if}}
    </p>
  
    {{#if nextStep}}
      <p>
        Next step: {{nextStep}}
      </p>
    {{/if}}
  </div>