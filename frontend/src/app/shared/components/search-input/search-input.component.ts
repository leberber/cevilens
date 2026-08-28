import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * SearchInputComponent - Unified search input with consistent styling
 *
 * @description
 * A reusable search input component that provides consistent styling and behavior
 * across the application. Features a search icon prefix and supports two-way binding.
 * Emits events on every keystroke, suitable for:
 * - Real-time filtering of lists and tables
 * - Autocomplete searches
 * - Incremental search with debouncing (in parent component)
 *
 * The component is minimal and delegating - it does not implement debouncing
 * or filtering logic internally. Parent components should handle those concerns
 * using services like PaginationHelper.
 *
 * @example
 * // Simple search with two-way binding
 * export class VentesComponent {
 *   searchTerm = '';
 *   filteredVentes: Vente[] = [];
 *
 *   constructor(private ventesService: VentesService) {}
 *
 *   onSearch(term: string) {
 *     this.searchTerm = term;
 *     if (term.length >= 2) {
 *       this.ventesService.search(term).subscribe(
 *         data => this.filteredVentes = data
 *       );
 *     } else {
 *       this.filteredVentes = [];
 *     }
 *   }
 * }
 *
 * // Template:
 * <app-search-input
 *   [(value)]="searchTerm"
 *   placeholder="Rechercher une vente..."
 *   (search)="onSearch($event)" />
 * <div *ngFor="let vente of filteredVentes">{{ vente.ref }}</div>
 *
 * @example
 * // With debounced search using PaginationHelper
 * export class ClientsComponent {
 *   searchTerm = '';
 *
 *   constructor(
 *     private clientsService: ClientsService,
 *     private paginationHelper: PaginationHelper
 *   ) {}
 *
 *   onSearch(term: string) {
 *     this.searchTerm = term;
 *     // PaginationHelper.debounceSearch() handles debouncing internally
 *     this.paginationHelper.debounceSearch(
 *       term,
 *       () => this.clientsService.search(term)
 *     ).subscribe(
 *       data => this.updateTable(data)
 *     );
 *   }
 * }
 *
 * // Template:
 * <app-search-input
 *   [value]="searchTerm"
 *   placeholder="Rechercher un client..."
 *   (valueChange)="searchTerm = $event"
 *   (search)="onSearch($event)" />
 *
 * @example
 * // With custom input styling
 * <app-search-input
 *   [(value)]="query"
 *   placeholder="Entrez votre recherche..."
 *   inputClass="search-input--large"
 *   (search)="performSearch($event)" />
 *
 * @output_events
 *
 * **valueChange** - Emitted on every input keystroke
 * - Type: EventEmitter<string>
 * - Payload: Current input value
 * - Frequency: On every character change
 * - Use case: Two-way binding with [(value)]
 * - Note: Use with caution for performance in large lists
 *
 * **search** - Emitted on every input keystroke (same as valueChange)
 * - Type: EventEmitter<string>
 * - Payload: Current input value
 * - Frequency: On every character change
 * - Use case: Trigger search/filter operations
 * - Recommendation: Debounce in parent or use PaginationHelper
 *
 * Both events fire on every keystroke. Implement debouncing in the parent
 * component for better performance with large datasets or expensive searches.
 *
 * @styling
 * CSS Classes:
 * - `.table-search`: Main container (flex, gap: 0.5rem)
 * - `.search-icon`: Icon wrapper
 * - `input`: Search input field
 *
 * CSS Variables Used:
 * - `--text-color-subdued`: Icon color
 *
 * Styling Details:
 * - Container: flex row with 0.5rem gap
 * - Icon: Uses PrimeNG icon font (pi pi-search)
 * - Input: Transparent background, no border, flexes to fill space
 * - Font size: 0.9rem (slightly smaller than body text)
 * - Integrates cleanly into table headers or filter bars
 *
 * Custom Input Classes:
 * - Pass inputClass prop to apply additional classes to input element
 * - Example: inputClass="input-large input-dark"
 * - Useful for different styling contexts (header vs sidebar vs dialog)
 *
 * @internal_flow
 * 1. User types in input field
 * 2. (input) event fires, calls onChange()
 * 3. onChange() updates internal value property
 * 4. valueChange event emitted (for two-way binding)
 * 5. search event emitted (for search handlers)
 * 6. Parent component receives event and can filter/search/debounce
 */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-search">
      <div class="search-icon"><i class="pi pi-search"></i></div>
      <input
        [(ngModel)]="value"
        (input)="onChange($event)"
        [placeholder]="placeholder"
        [class]="inputClass" />
    </div>
  `,
  styles: [`
    .table-search {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .search-icon {
      color: var(--text-color-subdued);
    }
    input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.9rem;
    }
  `],
})
export class SearchInputComponent {
  /**
   * Current search input value
   * @type {string}
   * @default ''
   *
   * Bound to the input field with ngModel.
   * Can be set via property binding or updated via two-way binding.
   * When updated, automatically triggers onChange() to emit events.
   *
   * @example
   * // Read/write via two-way binding
   * <app-search-input [(value)]="searchTerm" />
   *
   * @example
   * // One-way binding with separate update
   * <app-search-input
   *   [value]="searchTerm"
   *   (valueChange)="searchTerm = $event" />
   */
  @Input() value: string = '';

  /**
   * Placeholder text for the search input
   * @type {string}
   * @default 'Rechercher…'
   *
   * Shown in the input field when empty. Provides visual hint to users
   * about what they can search for.
   *
   * @example
   * <app-search-input placeholder="Rechercher un produit..." />
   *
   * @example
   * <app-search-input placeholder="Filter by client name..." />
   */
  @Input() placeholder: string = 'Rechercher…';

  /**
   * Additional CSS classes to apply to the input element
   * @type {string}
   * @default ''
   *
   * Allows customization of input styling for different contexts.
   * Classes are added directly to the input element (not the container).
   * Useful for:
   * - Changing size (input-sm, input-lg)
   * - Changing theme (input-dark, input-light)
   * - Adding borders or shadows in specific contexts
   *
   * @example
   * <app-search-input inputClass="input-lg input-dark" />
   *
   * @example
   * <app-search-input inputClass="search-input--emphasized" />
   */
  @Input() inputClass: string = '';

  /**
   * Emitted when the input value changes (via two-way binding)
   * @type {EventEmitter<string>}
   *
   * Fires on every keystroke. Emit the updated input value.
   * Used for two-way binding with [(value)].
   *
   * Performance: Fires on every character change. For performance-critical
   * applications with large datasets, consider:
   * - Using debouncing in parent component
   * - Using PaginationHelper.debounceSearch()
   * - Filtering client-side instead of server-side if dataset is small
   *
   * @example
   * // Two-way binding
   * <app-search-input [(value)]="searchTerm" />
   *
   * @example
   * // Manual binding
   * <app-search-input
   *   [value]="searchTerm"
   *   (valueChange)="searchTerm = $event" />
   */
  @Output() valueChange = new EventEmitter<string>();

  /**
   * Emitted when user types to trigger search
   * @type {EventEmitter<string>}
   *
   * Fires on every keystroke with the current input value.
   * This is the main event to listen to for search operations.
   *
   * Performance: Fires on every character change. Implement debouncing
   * in parent component or use PaginationHelper for better performance.
   *
   * @example
   * // Direct search handler
   * <app-search-input (search)="onSearch($event)" />
   *
   * constructor(private paginationHelper: PaginationHelper) {}
   *
   * onSearch(term: string) {
   *   // PaginationHelper handles debouncing
   *   this.paginationHelper.debounceSearch(
   *     term,
   *     () => this.ventesService.search(term)
   *   ).subscribe(data => this.updateResults(data));
   * }
   *
   * @example
   * // With minimum length check
   * onSearch(term: string) {
   *   if (term.length < 2) {
   *     this.results = [];
   *     return;
   *   }
   *   this.performSearch(term);
   * }
   *
   * @example
   * // With loading indicator
   * onSearch(term: string) {
   *   if (term.length === 0) {
   *     this.results = [];
   *     return;
   *   }
   *   this.isLoading = true;
   *   this.searchService.search(term).subscribe({
   *     next: (data) => {
   *       this.results = data;
   *       this.isLoading = false;
   *     },
   *     error: () => { this.isLoading = false; }
   *   });
   * }
   */
  @Output() search = new EventEmitter<string>();

  /**
   * Handles input changes and emits events
   * @internal
   *
   * Called on every character typed. Updates the internal value property
   * and emits both valueChange and search events.
   *
   * @param event - Native input event from the HTML input element
   */
  onChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.valueChange.emit(this.value);
    this.search.emit(this.value);
  }
}
