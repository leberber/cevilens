import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SortHeaderComponent - Sortable table header with visual sort indicators
 *
 * @description
 * A reusable table header component that displays sort state visually and emits
 * events when clicked. Designed for use within <table> elements to replace standard
 * <th> tags with interactive sortable headers.
 *
 * Features:
 * - Visual sort direction indicator (up/down arrows)
 * - Click handler to trigger sort operations
 * - CSS state classes for styling active sort columns
 * - Supports custom inline styles
 * - Slots for custom header content via ng-content
 *
 * The component itself does not sort data - it only emits events. Parent components
 * are responsible for receiving the event and updating sort state + data.
 *
 * @example
 * // Basic sortable table
 * export class VentesTableComponent {
 *   currentSortField: string | null = 'ref';
 *   sortDir: 1 | -1 = 1; // 1 = ascending, -1 = descending
 *   ventes: Vente[] = [];
 *
 *   onSortChange(field: string) {
 *     if (this.currentSortField === field) {
 *       // Toggle direction if same field
 *       this.sortDir = this.sortDir === 1 ? -1 : 1;
 *     } else {
 *       // New field, start with ascending
 *       this.currentSortField = field;
 *       this.sortDir = 1;
 *     }
 *     this.loadSortedData();
 *   }
 *
 *   loadSortedData() {
 *     this.ventesService.getVentes(
 *       this.currentSortField!,
 *       this.sortDir
 *     ).subscribe(data => this.ventes = data);
 *   }
 * }
 *
 * // Template:
 * <table>
 *   <thead>
 *     <tr>
 *       <app-sort-header
 *         field="ref"
 *         [currentSortField]="currentSortField"
 *         [sortDir]="sortDir"
 *         (sortChange)="onSortChange($event)">
 *         Référence
 *       </app-sort-header>
 *       <app-sort-header
 *         field="date"
 *         [currentSortField]="currentSortField"
 *         [sortDir]="sortDir"
 *         (sortChange)="onSortChange($event)">
 *         Date
 *       </app-sort-header>
 *       <app-sort-header
 *         field="amount"
 *         [currentSortField]="currentSortField"
 *         [sortDir]="sortDir"
 *         (sortChange)="onSortChange($event)">
 *         Montant
 *       </app-sort-header>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr *ngFor="let vente of ventes">
 *       <td>{{ vente.ref }}</td>
 *       <td>{{ vente.date }}</td>
 *       <td>{{ vente.amount }}</td>
 *     </tr>
 *   </tbody>
 * </table>
 *
 * @example
 * // With custom column widths
 * <app-sort-header
 *   field="reference"
 *   [currentSortField]="currentSortField"
 *   [sortDir]="sortDir"
 *   [style]="{ 'width': '15%' }"
 *   (sortChange)="onSortChange($event)">
 *   Référence
 * </app-sort-header>
 *
 * @example
 * // Toggle sort direction pattern
 * export class DataTableComponent {
 *   sortState = { field: 'name', dir: 1 as 1 | -1 };
 *
 *   toggleSort(newField: string) {
 *     if (this.sortState.field === newField) {
 *       this.sortState.dir = this.sortState.dir === 1 ? -1 : 1;
 *     } else {
 *       this.sortState.field = newField;
 *       this.sortState.dir = 1;
 *     }
 *     this.reloadData();
 *   }
 * }
 *
 * @input_properties
 *
 * **field** - Identifier for this sortable column
 * - Type: string
 * - Default: ''
 * - Used to identify which column the sort event is for
 * - Should be unique within the table
 * - Emitted with sortChange event
 * - Typically matches database/API field name (e.g., 'client_name', 'sale_date')
 *
 * **currentSortField** - Field that is currently being sorted
 * - Type: string | null
 * - Default: null
 * - Compared with field prop to determine if this header is active
 * - Controls visual styling and icon display
 * - Set to null to show no active sort
 * - Should match one of the field values in your table headers
 *
 * **sortDir** - Current sort direction (1 = asc, -1 = desc)
 * - Type: 1 | -1
 * - Default: 1 (ascending)
 * - Only used when currentSortField === field (this header is active)
 * - 1 = ascending (up arrow icon)
 * - -1 = descending (down arrow icon)
 *
 * **style** - Custom inline CSS styles
 * - Type: Record<string, string> | undefined
 * - Default: undefined
 * - Applied to <th> element using [ngStyle]
 * - Useful for column widths: { 'width': '20%' }
 * - Can include any CSS property: { 'text-align': 'right', 'padding': '10px' }
 *
 * @output_events
 *
 * **sortChange** - Emitted when header is clicked
 * - Type: EventEmitter<string>
 * - Payload: The field prop of the clicked header
 * - Fired: On every header click regardless of sort state
 * - Use case: Update sort state and reload data
 *
 * @example
 * // Handling sortChange event
 * <app-sort-header
 *   field="date"
 *   [currentSortField]="currentSort"
 *   [sortDir]="sortDir"
 *   (sortChange)="handleSort($event)">
 *   Date
 * </app-sort-header>
 *
 * handleSort(field: string) {
 *   console.log('User clicked sort for field:', field);
 *   // Update your sort state
 *   // Reload data with new sort
 * }
 *
 * @click_handler
 * When the <th> element is clicked:
 * 1. onHeaderClick() is triggered
 * 2. sortChange event emitted with field value
 * 3. Parent component receives event and updates sort state
 * 4. Parent reloads sorted data
 * 5. Component re-renders with updated props (currentSortField, sortDir)
 * 6. Icons update to reflect new sort state
 *
 * @styling
 * CSS Classes:
 * - `.th-sort`: Base header class (renders as <th>)
 * - `.th-sort--asc`: Applied when isSorting=true AND sortDir=1 (ascending)
 * - `.th-sort--desc`: Applied when isSorting=true AND sortDir=-1 (descending)
 *
 * CSS Usage Notes:
 * - Classes can be styled to highlight active sort column
 * - Use .th-sort--asc and .th-sort--desc for different visual states
 * - Example: Add background color to sorted column
 *   ```css
 *   .th-sort--asc,
 *   .th-sort--desc {
 *     background-color: rgba(59, 130, 246, 0.1);
 *   }
 *   ```
 *
 * Icon Display Logic:
 * - **Not sorting**: pi-sort-alt (neutral sort icon)
 * - **Ascending (sortDir=1)**: pi-sort-alt-up (up arrow)
 * - **Descending (sortDir=-1)**: pi-sort-alt-down (down arrow)
 * - Uses PrimeNG icon font (pi pi-*)
 *
 * @internal_computed
 *
 * **isSorting** - Computed getter
 * - Returns: this.currentSortField === this.field
 * - True if this is the currently sorted column
 * - Used for CSS class binding and icon selection
 * - Evaluated on every change detection cycle
 *
 * **getSortIconClass()** - Computed icon class
 * - Returns icon class name based on sorting state
 * - Returns 'pi-sort-alt' if not sorting (neutral state)
 * - Returns 'pi-sort-alt-up' if sorting ascending
 * - Returns 'pi-sort-alt-down' if sorting descending
 *
 * @accessibility
 * - Uses semantic <th> element (not styled <div>)
 * - Click handler on <th> is semantic (table headers are expected to be clickable)
 * - Consider adding aria-sort attribute for screen readers
 * - Icon visual indicators support user understanding of current sort state
 */
@Component({
  selector: 'app-sort-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <th
      class="th-sort"
      [class.th-sort--asc]="isSorting && sortDir === 1"
      [class.th-sort--desc]="isSorting && sortDir === -1"
      [ngStyle]="style"
      (click)="onHeaderClick()">
      <ng-content></ng-content>
      <i class="pi" [class]="getSortIconClass()"></i>
    </th>
  `,
})
export class SortHeaderComponent {
  /**
   * Database/API field name for this column
   * @type {string}
   * @default ''
   *
   * Unique identifier for the column being sorted. Used to:
   * - Identify which column was clicked via sortChange event
   * - Compare against currentSortField to determine if this header is active
   * - Typically matches the field name in database queries (e.g., 'ref', 'date', 'amount')
   *
   * @example
   * // Examples of field values
   * field="reference"      // String field
   * field="creation_date"  // Date field
   * field="total_amount"   // Number field
   * field="client_name"    // Foreign key field
   *
   * @important
   * Must be set to a unique value within the table. Two headers with the same
   * field value will both show as "active" when that field is sorted.
   */
  @Input() field: string = '';

  /**
   * The field that is currently being sorted
   * @type {string | null}
   * @default null
   *
   * Compared with this.field to determine if this header is currently sorted.
   * This is set by the parent component based on the current sort state.
   *
   * - When currentSortField === field: This header shows active styling and sort icon
   * - When currentSortField !== field: This header shows neutral sort icon
   * - When currentSortField is null: No header shows active state
   *
   * The parent component manages this value and updates it when the user clicks
   * a different header.
   *
   * @example
   * // Parent component tracking sort state
   * export class TableComponent {
   *   currentSortField: string | null = 'name';
   *   sortDir: 1 | -1 = 1;
   *
   *   onSortChange(field: string) {
   *     if (this.currentSortField === field) {
   *       this.sortDir = this.sortDir === 1 ? -1 : 1;
   *     } else {
   *       this.currentSortField = field;
   *       this.sortDir = 1;
   *     }
   *   }
   * }
   *
   * // Template: pass currentSortField to each header
   * <app-sort-header
   *   field="name"
   *   [currentSortField]="currentSortField"
   *   [sortDir]="sortDir"
   *   (sortChange)="onSortChange($event)">
   * </app-sort-header>
   */
  @Input() currentSortField: string | null = null;

  /**
   * Sort direction when this field is active
   * @type {1 | -1}
   * @default 1
   *
   * Controls sort direction and icon display:
   * - 1 = Ascending (A-Z, 0-9, earliest-latest)
   * - -1 = Descending (Z-A, 9-0, latest-earliest)
   *
   * Only affects visual display when isSorting is true (currentSortField === field).
   * When this header is not the active sort column, sortDir is ignored.
   *
   * @example
   * // 1 = Ascending - shows up arrow
   * <app-sort-header
   *   field="name"
   *   [currentSortField]="'name'"
   *   [sortDir]="1">
   *   Name
   * </app-sort-header>
   *
   * @example
   * // -1 = Descending - shows down arrow
   * <app-sort-header
   *   field="date"
   *   [currentSortField]="'date'"
   *   [sortDir]="-1">
   *   Date
   * </app-sort-header>
   */
  @Input() sortDir: 1 | -1 = 1;

  /**
   * Custom inline CSS styles for the <th> element
   * @type {Record<string, string> | undefined}
   * @default undefined
   *
   * Applied to the table header cell using [ngStyle]. Useful for:
   * - Setting column width: { 'width': '20%' }
   * - Text alignment: { 'text-align': 'right' }
   * - Padding: { 'padding': '10px 5px' }
   *
   * Example: Make a numeric column right-aligned with fixed width
   * ```typescript
   * headerStyle = {
   *   'width': '100px',
   *   'text-align': 'right'
   * };
   * ```
   *
   * Template:
   * ```html
   * <app-sort-header
   *   field="amount"
   *   [style]="headerStyle">
   *   Amount
   * </app-sort-header>
   * ```
   *
   * @important
   * Use standard CSS property names (camelCase in JS objects).
   * Example: 'text-align' not 'textAlign', or just use camelCase 'textAlign'.
   */
  @Input() style?: Record<string, string>;

  /**
   * Emitted when the header is clicked
   * @type {EventEmitter<string>}
   *
   * Emits the field name of the clicked header. The parent component
   * uses this to update sort state and reload data.
   *
   * The component does not sort data itself - it only signals that a column
   * header was clicked. The parent is responsible for:
   * 1. Receiving the sortChange event
   * 2. Deciding if sort direction should toggle or reset
   * 3. Sending new sort parameters to the API
   * 4. Updating currentSortField and sortDir props
   * 5. Reloading the table data
   *
   * @example
   * // Listening to sortChange event
   * <app-sort-header
   *   field="priority"
   *   [currentSortField]="currentSort"
   *   [sortDir]="sortDir"
   *   (sortChange)="onSort($event)">
   *   Priority
   * </app-sort-header>
   *
   * // In component:
   * onSort(field: string) {
   *   if (this.currentSort === field) {
   *     // Toggle direction
   *     this.sortDir = this.sortDir === 1 ? -1 : 1;
   *   } else {
   *     // New field
   *     this.currentSort = field;
   *     this.sortDir = 1;
   *   }
   *   this.loadData();
   * }
   */
  @Output() sortChange = new EventEmitter<string>();

  /**
   * Computed getter: True if this header's field is currently being sorted
   * @returns {boolean} True when currentSortField === field
   * @internal
   *
   * Used for:
   * - CSS class binding: th-sort--asc, th-sort--desc
   * - Icon selection logic: which icon to display
   *
   * @example
   * // In template:
   * [class.th-sort--asc]="isSorting && sortDir === 1"
   *
   * // Computed dynamically each change detection
   * get isSorting(): boolean {
   *   return this.currentSortField === this.field;
   * }
   */
  get isSorting(): boolean {
    return this.currentSortField === this.field;
  }

  /**
   * Returns PrimeNG icon class based on current sort state
   * @internal
   *
   * Logic:
   * - If not sorting this column: 'pi-sort-alt' (neutral sort icon)
   * - If sorting ascending (sortDir=1): 'pi-sort-alt-up' (up arrow)
   * - If sorting descending (sortDir=-1): 'pi-sort-alt-down' (down arrow)
   *
   * Called during template rendering to set the icon's CSS class.
   * PrimeNG provides these icon fonts as part of the icons library.
   *
   * @returns {string} Icon class name to apply
   */
  getSortIconClass(): string {
    if (!this.isSorting) return 'pi-sort-alt';
    return this.sortDir === 1 ? 'pi-sort-alt-up' : 'pi-sort-alt-down';
  }

  /**
   * Handles header click by emitting sortChange event
   * @internal
   *
   * Called when user clicks the <th> element.
   * Emits sortChange event with this.field value.
   * Parent component receives the event and updates sort state.
   */
  onHeaderClick(): void {
    this.sortChange.emit(this.field);
  }
}
