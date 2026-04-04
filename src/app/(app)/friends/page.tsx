'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, UserPlus, Plus } from 'lucide-react'

export default function FriendsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Friends & Groups</h1>
        <p className="text-muted-foreground">Manage your friends and frequent groups</p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input placeholder="Search by email..." className="flex-1" />
            <Button><UserPlus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No friends yet</h3>
            <p className="text-sm text-muted-foreground">Add friends to quickly add them to bills</p>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4 mt-4">
          <Button variant="outline"><Plus className="h-4 w-4 mr-1" />New Group</Button>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No groups yet</h3>
            <p className="text-sm text-muted-foreground">Create groups for your frequent dining partners</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
