import { JSONPath } from 'jsonpath-plus';

export class PaginationJsonPath {
  data = {};
  tableName = '';

  constructor(tableName, data) {
    this.data = data;
    this.tableName = tableName;
  }

  /**
   * @params filterInput is Array for OR operation, object for AND operation
   */
  paginate() {
    let filtered = [];

    if (options.filter) {
      filtered = this.applyFilters(this.data, options.filter);
    } else {
      filtered = [...this.data[this.tableName]];
    }

    if (options.sort) {
      filtered = this.applySort(filtered, options.sort);
    }

    // Paginate
    const page = options.page || 1;
    const limit = options.limit || 10;
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;

    return {
      items: filtered.slice(startIdx, endIdx),
      total: filtered.length,
      page: Math.ceil(filtered.length / limit),
    };
  }

  applyFilters(data, filters) {
    let query = '';
    if (Array.isArray(filters)) {
      query = this.buildOR(filters);
      const queries = query.map((q) => `$.${this.tableName}[?(${q})]`);

      console.log(queries);

      const set = new Set();
      queries.forEach((q) => {
        const result = JSONPath({
          path: q,
          json: data,
        });

        result.forEach((r) => set.add(r));
      });

      return Array.from(set);
    } else {
      query = this.buildAND(filters);
      const actual = `$.${this.tableName}[?(${query})]`;
      return JSONPath({
        path: actual,
        json: data,
      });
    }
  }

  buildOR(filters) {
    const query = [];
    filters.forEach((f) => {
      query.push(this.buildAND(f));
    });

    return query;
  }

  buildAND(filter) {
    const query = [];
    Object.entries(filter).forEach(([key, val]) => {
      query.push(this.buildQuery(key, val));
    });

    return query.join(' && ');
  }

  buildQuery(key, value) {
    let query = '';

    // If value is an object, loop through its entries
    Object.entries(value).forEach(([operator, val]) => {
      // console.log(key, value);

      if (typeof val === 'object' && !Array.isArray(val)) {
        query += `@.${key}[?(${this.buildQuery(operator, val)})]`;
      } else {
        const formattedValue = typeof val === 'string' ? `'${val}'` : val; // Wrap strings in quotes
        switch (operator) {
          case 'eq':
            query += `@.${key}==${formattedValue}`;
            break;
          case 'ne':
            query += `@.${key}!=${formattedValue}`;
            break;
          case 'gt':
            query += `@.${key}>${formattedValue}`;
            break;
          case 'gte':
            query += `@.${key}>=${formattedValue}`;
            break;
          case 'lt':
            query += `@.${key}<${formattedValue}`;
            break;
          case 'lte':
            query += `@.${key}<=${formattedValue}`;
            break;
          case 'in':
            query += `(${val.map((v) => `@.${key}==${JSON.stringify(v)}`).join(' || ')})`;
            break;
          case 'nin':
            query += `(${val.map((v) => `@.${key}!=${JSON.stringify(v)}`).join(' && ')})`;
            break;
          default:
            throw new Error(`Unsupported operator: ${operator}`);
        }
      }
    });

    return query;
  }

  applySort(data, sort) {
    return [...data].sort((a, b) => {
      for (const [field, order] of Object.entries(sort)) {
        if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
      }
      return 0; // Ensure a number is always returned
    });
  }
}

// Sample

// Example 1: Simple pagination with filtering and sorting
const data = {
  users: [
    {
      id: 1,
      name: 'Alice',
      age: 25,
      createdAt: new Date('2023-01-01'),
      books: [
        {
          id: 1,
          title: 'Marvel',
        },
      ],
    },
    {
      id: 2,
      name: 'Bob',
      age: 30,
      createdAt: new Date('2023-02-01'),
      books: [
        {
          id: 2,
          title: 'DC Comics',
        },
      ],
    },
    {
      id: 3,
      name: 'Charlie',
      age: 35,
      createdAt: new Date('2023-03-01'),
      books: [
        {
          id: 3,
          title: 'Image Comics',
        },
      ],
    },
  ],
};

const paginationService = new PaginationJsonPath('users', data);

const options = {
  filter: [
    {
      id: {
        eq: 3,
      },
    },
    {
      books: {
        id: {
          eq: 3,
        },
      },
    },
    {
      age: {
        gt: 25,
      },
    },
  ],
  sort: { age: 'desc' },
  page: 1,
  limit: 2,
};

console.log(paginationService.paginate(options));
