import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'react-query'
import axios from 'axios'
import { 
  PlusIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  BeakerIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatRelativeTime } from '../../lib/utils'

export default function Dashboard() {
  const { data: assistants, isLoading: assistantsLoading } = useQuery(
    'assistants',
    () => axios.get('/api/assistants').then(res => res.data.assistants),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  const { data: analytics, isLoading: analyticsLoading } = useQuery(
    'dashboard-analytics',
    () => axios.get('/api/analytics/dashboard').then(res => res.data),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  )

  if (assistantsLoading && analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Assistants',
      value: analytics?.overview?.totalAssistants || 0,
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
      href: '/assistants'
    },
    {
      name: 'Active Assistants', 
      value: analytics?.overview?.activeAssistants || 0,
      icon: CogIcon,
      color: 'bg-green-500',
      href: '/assistants'
    },
    {
      name: 'Total Chats',
      value: analytics?.overview?.totalChats || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-purple-500',
      href: '/analytics'
    },
    {
      name: 'Avg Response Time',
      value: analytics?.overview?.avgResponseTime ? `${analytics.overview.avgResponseTime}ms` : '0ms',
      icon: ChartBarIcon,
      color: 'bg-orange-500',
      href: '/analytics'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <div className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-secondary-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-medium text-secondary-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/assistants/new">
            <div className="flex items-center p-4 border-2 border-dashed border-secondary-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer">
              <PlusIcon className="h-6 w-6 text-secondary-400 mr-3" />
              <div>
                <p className="font-medium text-secondary-900">Create Assistant</p>
                <p className="text-sm text-secondary-600">Set up a new AI assistant</p>
              </div>
            </div>
          </Link>
          
          <Link href="/tests">
            <div className="flex items-center p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors cursor-pointer">
              <BeakerIcon className="h-6 w-6 text-secondary-400 mr-3" />
              <div>
                <p className="font-medium text-secondary-900">Run Tests</p>
                <p className="text-sm text-secondary-600">Test assistant responses</p>
              </div>
            </div>
          </Link>
          
          <Link href="/analytics">
            <div className="flex items-center p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors cursor-pointer">
              <ChartBarIcon className="h-6 w-6 text-secondary-400 mr-3" />
              <div>
                <p className="font-medium text-secondary-900">View Analytics</p>
                <p className="text-sm text-secondary-600">Monitor performance</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Assistants */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-secondary-900">Recent Assistants</h2>
          <Link href="/assistants" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all →
          </Link>
        </div>
        
        {assistantsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : assistants?.length > 0 ? (
          <div className="space-y-4">
            {assistants.slice(0, 5).map((assistant: any) => (
              <Link key={assistant.id} href={`/assistants/${assistant.id}`}>
                <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900">{assistant.name}</p>
                      <p className="text-sm text-secondary-600">
                        {assistant._count?.documents || 0} documents • {assistant._count?.conversations || 0} conversations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      assistant.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {assistant.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <p className="text-xs text-secondary-500 mt-1">
                      {formatRelativeTime(assistant.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">No assistants created yet</p>
            <Link href="/assistants/new" className="btn-primary mt-4">
              Create your first assistant
            </Link>
          </div>
        )}
      </div>

      {/* Top Questions */}
      {analytics?.topQuestions && analytics.topQuestions.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-medium text-secondary-900 mb-6">Most Asked Questions</h2>
          <div className="space-y-3">
            {analytics.topQuestions.slice(0, 5).map((question: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <p className="text-secondary-700 flex-1">{question.question}</p>
                <span className="text-sm text-secondary-500 ml-4">{question.count} times</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}