/**
 * Phase 71: Employee Management & Records
 * Employee profiles, organizational hierarchy, employment records
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type DepartmentType = 'engineering' | 'sales' | 'marketing' | 'operations' | 'finance' | 'hr' | 'other';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: EmploymentStatus;
  type: EmploymentType;
  department: DepartmentType;
  title: string;
  managerId?: string;
  startDate: number;
  endDate?: number;
  createdAt: number;
}

export interface EmployeeProfile {
  employeeId: string;
  location: string;
  officeLocation?: string;
  skills: string[];
  certifications: string[];
  languages: string[];
  bio?: string;
  photo?: string;
}

export interface EmploymentRecord {
  id: string;
  employeeId: string;
  eventType: 'hire' | 'promotion' | 'transfer' | 'leave' | 'termination';
  previousRole?: string;
  newRole?: string;
  effectiveDate: number;
  notes: string;
  createdAt: number;
}

// ==================== EMPLOYEE MANAGER ====================

export class EmployeeManager {
  private employees = new Map<string, Employee>();
  private employeeCount = 0;

  /**
   * Create employee
   */
  createEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const id = 'emp-' + Date.now() + '-' + this.employeeCount++;

    const newEmployee: Employee = {
      ...employee,
      id,
      createdAt: Date.now()
    };

    this.employees.set(id, newEmployee);
    logger.info('Employee created', { employeeId: id, name: `${employee.firstName} ${employee.lastName}` });

    return newEmployee;
  }

  /**
   * Get employee
   */
  getEmployee(employeeId: string): Employee | null {
    return this.employees.get(employeeId) || null;
  }

  /**
   * List employees
   */
  listEmployees(status?: EmploymentStatus, department?: DepartmentType): Employee[] {
    let employees = Array.from(this.employees.values());

    if (status) {
      employees = employees.filter(e => e.status === status);
    }

    if (department) {
      employees = employees.filter(e => e.department === department);
    }

    return employees;
  }

  /**
   * Search employees
   */
  searchEmployees(query: string): Employee[] {
    const lower = query.toLowerCase();

    return Array.from(this.employees.values()).filter(
      e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(lower) || e.email.toLowerCase().includes(lower)
    );
  }

  /**
   * Update employee
   */
  updateEmployee(employeeId: string, updates: Partial<Employee>): void {
    const employee = this.employees.get(employeeId);
    if (employee) {
      Object.assign(employee, updates);
      logger.debug('Employee updated', { employeeId });
    }
  }

  /**
   * Get direct reports
   */
  getDirectReports(managerId: string): Employee[] {
    return Array.from(this.employees.values()).filter(e => e.managerId === managerId);
  }

  /**
   * Get org chart
   */
  getOrgChart(): Record<string, any> {
    const chart: Record<string, any> = {};

    this.employees.forEach(emp => {
      if (!emp.managerId) {
        chart[emp.id] = { employee: emp, reports: this.getDirectReports(emp.id) };
      }
    });

    logger.debug('Org chart retrieved');

    return chart;
  }

  /**
   * Terminate employee
   */
  terminateEmployee(employeeId: string, effectiveDate: number, reason: string): void {
    const employee = this.employees.get(employeeId);
    if (employee) {
      employee.status = 'terminated';
      employee.endDate = effectiveDate;
      logger.info('Employee terminated', { employeeId, reason });
    }
  }
}

// ==================== EMPLOYEE PROFILE MANAGER ====================

export class EmployeeProfileManager {
  private profiles = new Map<string, EmployeeProfile>();

  /**
   * Create profile
   */
  createProfile(profile: Omit<EmployeeProfile, 'createdAt'>): EmployeeProfile {
    this.profiles.set(profile.employeeId, profile);
    logger.debug('Employee profile created', { employeeId: profile.employeeId });

    return profile;
  }

  /**
   * Get profile
   */
  getProfile(employeeId: string): EmployeeProfile | null {
    return this.profiles.get(employeeId) || null;
  }

  /**
   * Update profile
   */
  updateProfile(employeeId: string, updates: Partial<EmployeeProfile>): void {
    const profile = this.profiles.get(employeeId);
    if (profile) {
      Object.assign(profile, updates);
      logger.debug('Employee profile updated', { employeeId });
    }
  }

  /**
   * Add skill
   */
  addSkill(employeeId: string, skill: string): void {
    const profile = this.profiles.get(employeeId);
    if (profile && !profile.skills.includes(skill)) {
      profile.skills.push(skill);
      logger.debug('Skill added', { employeeId, skill });
    }
  }

  /**
   * Add certification
   */
  addCertification(employeeId: string, certification: string): void {
    const profile = this.profiles.get(employeeId);
    if (profile && !profile.certifications.includes(certification)) {
      profile.certifications.push(certification);
      logger.debug('Certification added', { employeeId, certification });
    }
  }
}

// ==================== EMPLOYMENT HISTORY ====================

export class EmploymentHistory {
  private records: EmploymentRecord[] = [];
  private recordCount = 0;

  /**
   * Record event
   */
  recordEvent(event: Omit<EmploymentRecord, 'id' | 'createdAt'>): EmploymentRecord {
    const record: EmploymentRecord = {
      ...event,
      id: 'record-' + Date.now() + '-' + this.recordCount++,
      createdAt: Date.now()
    };

    this.records.push(record);
    logger.info('Employment event recorded', { employeeId: event.employeeId, eventType: event.eventType });

    return record;
  }

  /**
   * Get history
   */
  getHistory(employeeId: string): EmploymentRecord[] {
    return this.records.filter(r => r.employeeId === employeeId);
  }

  /**
   * Get timeline
   */
  getTimeline(employeeId: string, startDate: number, endDate: number): EmploymentRecord[] {
    return this.records.filter(
      r => r.employeeId === employeeId && r.effectiveDate >= startDate && r.effectiveDate <= endDate
    );
  }
}

// ==================== EXPORTS ====================

export const employeeManager = new EmployeeManager();
export const employeeProfileManager = new EmployeeProfileManager();
export const employmentHistory = new EmploymentHistory();
